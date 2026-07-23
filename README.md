<!--
  Add your banner image to the repo (e.g. assets/banner.png) and this will render it.
  Recommended size: 1280×640 (2:1), works well as both the README banner and the GitHub social preview image.
-->
<p align="center">
  <img src="./assets/<img width="1983" height="793" alt="ChatGPT Image Jul 23, 2026, 10_40_19 PM" src="https://github.com/user-attachments/assets/f4348db5-f4ab-428b-977c-72f2fecb3de1" />

</p>

<h1 align="center">Sarkaari-Grade QA Agent</h1>
<p align="center"><i>An autonomous browser agent that turns plain-English bug reports into reproducible, self-healing Playwright tests.</i></p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-86.6%25-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Playwright-automation-2EAD33?logo=playwright&logoColor=white" alt="Playwright">
  <img src="https://img.shields.io/badge/Agent-Claude%20Sonnet-D97757" alt="Claude">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License">
</p>

<p align="center">Built for the Browser Agents Hackathon — HSR FC / Perch Club, Bengaluru · Track: QA & Web Testing</p>

---

## TL;DR

Give it a bug report the way a human actually writes one — *"When I click Checkout with an empty cart, the app shows an error"* — and it autonomously explores your app, reproduces the failure, generates a deterministic Playwright test, verifies the test three times for determinism, and later **self-heals** that test's selectors when the UI changes. Nine working TypeScript modules, no proprietary platform lock-in, output is a plain `.spec.ts` file you commit to your own repo.

```bash
npm install && npx playwright install chromium
cp .env.example .env   # add ANTHROPIC_API_KEY
npm run demo           # dashboard: localhost:5173
```

---

## Table of Contents

1. [The Problem](#1-the-problem)
2. [The Gap](#2-the-gap)
3. [Our Approach](#3-our-approach)
4. [System Architecture](#4-system-architecture)
5. [Technology Stack](#5-technology-stack)
6. [What We Built](#6-what-we-built)
7. [Quick Start](#7-quick-start)
8. [Key Design Decisions](#8-key-design-decisions)
9. [Repository Layout](#9-repository-layout)
10. [Future Work](#10-future-work)
11. [License](#11-license)

---

## 1. The Problem

Every engineering organization that ships a web product eventually adopts end-to-end (E2E) browser testing (Selenium, Cypress, Playwright). In practice, three failure modes dominate developer experience with these suites:

| Failure mode | What actually happens |
|---|---|
| **Authoring cost** | Writing a new E2E test from a bug report or a spec requires a human to manually explore the app, identify selectors, and hand-code the interaction sequence — routinely 30–90 minutes per test. |
| **Maintenance cost** | Selector breakage from routine UI changes is the leading cause of E2E suite flakiness, and it's compounding: the more tests a team has, the more of them break on any given refactor. Teams commonly respond by disabling or ignoring failing tests rather than fixing them — "alert fatigue" that quietly erodes the safety net the suite was built to provide. |
| **Reproduction cost** | A bug report filed in plain English (by a support agent, a PM, or an end user) has to be manually translated into a reproducible technical scenario before an engineer can even start debugging — a repetitive, low-creativity, highly automatable translation step. |

**Why now.** Two things changed recently that make this problem newly solvable. First, LLM-driven browser agents can interpret a live DOM/accessibility tree and act on it with much higher reliability than earlier heuristic RPA tools. Second, the same models can now emit structured, syntactically correct code as an output format, not just narrate actions in natural language. That combination — reliable perception-and-action *plus* reliable code generation — is what closes the loop between "agent understands intent" and "agent produces a durable engineering artifact," and it simply wasn't practical even 18 months ago.

## 2. The Gap

We mapped the existing landscape across three adjacent categories before writing a line of code: traditional test automation frameworks, general-purpose AI browser agents, and commercial self-healing test platforms.

| Category | Representative tools | Authoring automation | Self-healing | Output artifact |
|---|---|---|---|---|
| Traditional E2E | Selenium, Cypress | None (hand-coded) | No | Script (manual) |
| Recorder-based | Playwright Codegen | Records clicks only | No | Script (literal replay) |
| General browser agents | Browser Use, Stagehand, Anthropic Computer Use | Full NL → action | No (not core focus) | Action log / none |
| Commercial self-healing QA | Mabl-style, testRigor-style platforms | Partial | Yes (proprietary) | Locked-in platform |
| **Sarkaari-Grade (this project)** | — | Full NL → action | Yes (open, LLM-reasoned) | Portable Playwright `.spec.ts` |

Three concrete gaps fall out of this comparison, and our solution is scoped to close exactly these three:

- **Gap 1 — No tool bridges "plain-English report" to "working reproduction."** Every existing tool assumes a human has already located the bug and knows the reproduction steps. None take an unstructured sentence, autonomously explore an unfamiliar app to find the relevant flow, and confirm the described failure actually occurs.
- **Gap 2 — Agent output is ephemeral, not durable.** General-purpose browser agents perform a task and the value disappears once the session ends. Engineering teams need a committable artifact that lives in version control and runs in CI on every future deploy — not a one-off action log.
- **Gap 3 — Self-healing is locked behind proprietary platforms.** The self-healing capability that would make generated tests actually maintainable long-term exists commercially, but not as an open, LLM-reasoning-based approach that can *explain* why it changed a selector — which matters for engineer trust and code review.

## 3. Our Approach

> *Given a plain-English bug report and a target URL, autonomously explore the application, reproduce the described failure, and emit a deterministic, version-controllable Playwright test — then keep that test alive by self-healing its selectors when the UI changes, with a transparent, reviewable reasoning trail.*

The system operates in three modes, corresponding to states in the pipeline described in §4:

- **Reproduce** — take a natural-language bug report + target URL, explore the site autonomously via the live accessibility tree, and confirm the described failure.
- **Codify** — convert the successful reproduction trace into a clean, deterministic `.spec.ts` file with role/text-based assertions, not a literal replay of clicks.
- **Heal** — on a later run, if a selector fails, re-fetch the live accessibility tree, semantically re-identify the intended element, patch the test with a minimal diff, and log a human-readable rationale for the change.

This is not a thin prompt wrapped around an agent framework. The engineering that makes it work: (a) bounding agent exploration to a hard step budget and per-stage timeouts so it terminates instead of wandering; (b) converting an unstructured accessibility-tree trace into idiomatic, minimal Playwright code rather than a literal click-by-click replay; (c) a verification gate that compiles and runs the generated test multiple times before it's ever shown to a user; and (d) a healing algorithm that re-grounds a broken locator using accessible-name/role/text semantics rather than blind re-scraping.

## 4. System Architecture

The pipeline is an explicit state machine, not a single free-form agent loop — this is what makes it reliable enough to run live, not just in a controlled recording.

```
IDLE → EXPLORING → REPRODUCING → CODIFYING → VERIFYING → PASS → DONE
                                    ↓ fail
                                 HEALING → VERIFYING
                                    ↓ max retries / timeout
                            FALLBACK_RECORDING → DONE
```

| Module | Purpose |
|---|---|
| [`demo-app`](./demo-app) | Seeded, self-hosted buggy e-commerce app used as the fixed reproduction target |
| [`agent`](./agent) | Claude-powered reproduction loop; reasons over the live accessibility tree, not screenshots |
| [`codegen`](./codegen) | Converts a reproduction trace into a Playwright `.spec.ts` using role/text locators, validated with `tsc` |
| [`verifier`](./verifier) | Runs the generated spec 3× headlessly to confirm determinism |
| [`healer`](./healer) | Re-fetches the live accessibility tree and applies a minimal, semantic locator patch when a selector breaks |
| [`orchestrator`](./orchestrator) | State machine + Express REST API + Socket.IO, coordinating every module and streaming stage events |
| [`dashboard`](./dashboard) | React / Vite / Tailwind UI showing live pipeline stage transitions, generated code, and heal diffs |
| [`fallback`](./fallback) | Pre-verified spec + trace, used transparently if live exploration can't reproduce the bug in time |
| [`shared`](./shared) | Cross-module types and constants |
| [`traces`](./traces) / [`generated`](./generated) | Structured JSON reproduction traces and the resulting Playwright output |

**Reliability is a first-class design constraint, not an afterthought.** Every stage has a hard 45-second timeout and a 2-retry budget — the agent never hangs indefinitely. If live exploration can't reproduce the bug within budget, the orchestrator transitions to `FALLBACK_RECORDING` and serves a pre-verified spec and trace, with an explicit signal rather than silently faking success. Without `ANTHROPIC_API_KEY` set, the pipeline degrades to deterministic local heuristics instead of failing outright.

## 5. Technology Stack

| Layer | Technology | Why |
|---|---|---|
| Browser automation | **Playwright** | Fastest, most reliable cross-browser driver; native trace tooling to build on |
| Agent reasoning | **Claude (`claude-sonnet-4-6`)** via Anthropic API | Reads `page.accessibility.snapshot()` output for step-wise action selection and structured code generation, grounded in accessible-name/role/text rather than pixels |
| Codegen validation | **TypeScript compiler (`tsc`)** | Every generated spec is compiled before it reaches the verifier, with one automatic retry on type errors |
| Test runtime | **Playwright Test Runner** (headless, 3 runs, 0 retries) | Proves determinism and executes the post-heal re-run |
| Backend orchestration | **Node.js + Express + Socket.IO** | State machine wiring dashboard ↔ agent ↔ codegen ↔ verifier ↔ healer, with real-time event streaming |
| Frontend | **React + Vite + Tailwind CSS** | Live pipeline-stage visualization, generated-code viewer, heal-diff display |
| Trace storage | **Local JSON** (`traces/`, `generated/`) | Zero-setup persistence, no external DB dependency |
| Demo target | Self-hosted seeded e-commerce app | Avoids dependency on third-party production sites that could go down or rate-limit mid-run |

Language mix: **TypeScript 86.6% · JavaScript 6.4% · HTML 3.7% · CSS 3.3%** (repository statistics).

The stack intentionally reuses only mature, well-understood primitives — nothing here is a research prototype dependency. That was deliberate: it let the team spend the limited build window on the orchestration and codegen logic that actually differentiates the project, rather than on infrastructure plumbing.

## 6. What We Built

All nine modules described in §4 are implemented and working end to end, not left as a whiteboard design:

- ✅ Full reproduce → codify → verify pipeline driving a real Claude agent against a live accessibility tree
- ✅ Codegen that emits role/text-locator Playwright specs and validates them with `tsc` before handoff
- ✅ A 3-run determinism gate in the verifier
- ✅ A working self-healing demo: append `?breakSelector=checkout` to the demo app, watch the test fail, watch the healer re-locate the element and patch the spec with a diff + rationale
- ✅ A live React dashboard showing stage-by-stage progress over Socket.IO
- ✅ A fallback path (`FALLBACK_RECORDING`) so a live demo degrades gracefully instead of hanging

**Seeded demo bugs:**

1. **Empty cart checkout** — clicking Checkout with an empty cart throws / shows `Cannot checkout: cart is empty`.
2. **Contact form silent fail** — the form submits without validating the required Name field.
3. **Heal demo** — `?breakSelector=checkout` renames Checkout → "Proceed to Payment," deliberately breaking a generated spec's selector.

## 7. Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright browsers
npx playwright install chromium

# 3. Configure API key
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY if you want Claude-powered reasoning

# 4. Start the full demo (demo-app + orchestrator + dashboard)
npm run demo
```

| Service | URL |
|---|---|
| Dashboard | http://localhost:5173 |
| Demo app | http://localhost:3001 |
| Orchestrator API/WebSocket | http://localhost:3000 |

<details>
<summary><b>Running modules standalone</b></summary>

```bash
# Demo app only
npm run start -w demo-app

# Agent reproduction (requires demo-app running + ANTHROPIC_API_KEY)
npm run agent -- "When I click Checkout with an empty cart, the app shows an error" http://localhost:3001

# Codegen from the latest trace
npm run codegen
npm run codegen -- traces/trace-123.json     # or a specific trace

# Verifier
npm run verify
npm run verify -- generated/bug-123.spec.ts  # or a specific spec

# Healer, against a known failure
npm run heal -- generated/bug-123.spec.ts "locator.click: Timeout"

# Orchestrator API only
npm run orchestrator

# Dashboard only
npm run start -w dashboard
```

</details>

<details>
<summary><b>Environment variables</b></summary>

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Optional; the pipeline falls back to deterministic local heuristics if unset |
| `DEMO_APP_PORT` | `3001` | Demo app port |
| `ORCHESTRATOR_PORT` | `3000` | Orchestrator API/WebSocket port |
| `DASHBOARD_PORT` | `5173` | Vite dev server port |
| `DEMO_APP_URL` | `http://localhost:3001` | Target URL the agent explores |

</details>

<details>
<summary><b>REST API</b></summary>

```bash
curl -X POST http://localhost:3000/api/run \
  -H "Content-Type: application/json" \
  -d '{"bugReport":"Empty cart checkout shows error","targetUrl":"http://localhost:3001"}'
```

Live progress streams over Socket.IO: `pipeline:start`, `pipeline:event`, `pipeline:end`, `pipeline:error`.

</details>

## 8. Key Design Decisions

- **Accessibility tree first** — grounding every decision in `page.accessibility.snapshot()` rather than pixels means the agent's reasoning and the codegen's locators come from the same semantic source, which is *why* healing later works: both stages understand "the button" the same way.
- **Bounded exploration** — a hard 12-step cap, 45-second timeout, 2 retries per stage. An agent that can wander indefinitely isn't a QA tool, it's a liability.
- **Graceful degradation over silent failure** — `FALLBACK_RECORDING` is a named, visible state, not a hidden catch block.
- **Compile before you trust** — `tsc` validation before the verifier ever runs the spec, with one retry on type errors.
- **Determinism over speed** — 3 verification runs, 0 Playwright-level retries. A test isn't "passing" until it agrees with itself three times running.
- **Minimal, explainable healing** — the healer patches only the broken locator using a fresh accessibility snapshot, and attaches a plain-English rationale to the diff. It never rewrites assertions or regenerates the whole spec — that would silently change what the test actually verifies.
- **Offline-friendly** — without `ANTHROPIC_API_KEY`, the pipeline runs on deterministic local heuristics instead of failing outright.

## 9. Repository Layout

```
.
├── agent/            # Claude-powered exploration & reproduction
├── codegen/           # Trace → Playwright spec generation
├── dashboard/         # React/Vite/Tailwind live UI
├── demo-app/          # Seeded target application
├── fallback/          # Pre-verified spec + trace safety net
├── generated/         # Output Playwright specs
├── healer/            # Selector self-repair
├── orchestrator/       # State machine, REST API, WebSocket
├── shared/            # Cross-module types & constants
├── traces/            # Structured JSON reproduction traces
├── verifier/          # Determinism verification runner
├── .env.example
├── package.json
├── playwright.config.ts
└── tsconfig.json
```

## 10. Future Work

- **CI/CD integration** — run the healer as a GitHub Action whenever an E2E suite fails, opening a pull request with the proposed selector patch for human review.
- **Multi-app generalization** — extend beyond the seeded demo app to arbitrary staging environments via a lightweight site-adapter layer.
- **Bug-report ingestion from real channels** — connect to Jira / Linear / Slack so a filed bug report automatically triggers reproduction and test generation.
- **Flakiness analytics** — track how often each generated test needed healing over time as a signal of underlying UI instability.
- **Visual regression** — extend the same trace-capture pipeline to flag unintended visual changes, not just functional breakage.

## 11. License

MIT — hackathon project.

---

<p align="center"><sub>Sarkaari-Grade QA Agent · Browser Agents Hackathon, Bengaluru</sub></p>

# Sarkaari-Grade QA Agent

**An autonomous browser agent that turns plain-English bug reports into reproducible, self-healing Playwright tests.**

Built for the Browser Agents Hackathon — HSR FC / Perch Club, Bengaluru · Track: QA & Web Testing

![TypeScript](https://img.shields.io/badge/TypeScript-86.6%25-3178C6?logo=typescript&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-automation-2EAD33?logo=playwright&logoColor=white)
![Claude](https://img.shields.io/badge/Agent-Claude%20Sonnet-D97757)
![License](https://img.shields.io/badge/license-MIT-blue)

Most E2E test suites are either hand-written and brittle, or too expensive to maintain — a single UI refactor breaks selectors across the whole suite. Sarkaari-Grade closes that gap: give it a bug report the way a human actually writes one, and it explores your app, reproduces the bug, generates a real Playwright spec, verifies it's deterministic, and repairs it automatically when the UI changes.

```
"When I click Checkout with an empty cart, the app shows an error"
        │
        ▼
   ┌─────────┐      finds & confirms       ┌──────────────┐
   │  Agent  │ ───────────────────────────▶│ Reproduction │
   └─────────┘        the bug live          │    Trace     │
                                             └──────┬───────┘
                                                     ▼
                                          ┌─────────────────────┐
                                          │  Playwright .spec.ts │
                                          │  (role/text locators)│
                                          └──────────┬───────────┘
                                                     ▼
                                        verified 3× for determinism
                                                     ▼
                                   UI changes later → selector breaks →
                                        agent self-heals the test
```

---

## Table of Contents

- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Demo App Bugs](#demo-app-bugs)
- [Running Modules Standalone](#running-modules-standalone)
- [Environment Variables](#environment-variables)
- [Key Design Decisions](#key-design-decisions)
- [API](#api)
- [Repository Layout](#repository-layout)
- [Tech Stack](#tech-stack)
- [License](#license)

---

## Architecture

The pipeline is an explicit state machine, not a single free-form agent loop — this is what makes it reliable enough to run live on stage.

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

## Quick Start

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

## Demo App Bugs

The seeded demo app ships with three scenarios used to exercise the full pipeline:

1. **Empty cart checkout** — clicking Checkout with an empty cart throws / shows `Cannot checkout: cart is empty`.
2. **Contact form silent fail** — the form submits without validating the required Name field.
3. **Heal demo** — append `?breakSelector=checkout` to the demo app URL to rename Checkout → "Proceed to Payment," deliberately breaking a generated spec's selector so the healer has something real to repair.

## Running Modules Standalone

Each pipeline stage can be exercised independently for testing or rehearsal:

```bash
# Demo app only
npm run start -w demo-app

# Agent reproduction (requires demo-app running + ANTHROPIC_API_KEY)
npm run agent -- "When I click Checkout with an empty cart, the app shows an error" http://localhost:3001

# Codegen from the latest trace
npm run codegen
npm run codegen -- traces/trace-123.json     # or a specific trace

# Verifier (requires demo-app running + a generated spec)
npm run verify
npm run verify -- generated/bug-123.spec.ts  # or a specific spec

# Healer, against a known failure
npm run heal -- generated/bug-123.spec.ts "locator.click: Timeout"

# Orchestrator API only
npm run orchestrator

# Dashboard only
npm run start -w dashboard
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Optional; the pipeline falls back to deterministic local heuristics if unset |
| `DEMO_APP_PORT` | `3001` | Demo app port |
| `ORCHESTRATOR_PORT` | `3000` | Orchestrator API/WebSocket port |
| `DASHBOARD_PORT` | `5173` | Vite dev server port |
| `DEMO_APP_URL` | `http://localhost:3001` | Target URL the agent explores |

## Key Design Decisions

- **Accessibility tree first** — the agent reasons over `page.accessibility.snapshot()` (via Claude, `claude-sonnet-4-6`), not screenshots or raw pixels.
- **Bounded exploration** — a hard cap of 12 structured JSON actions per run, with a 45-second timeout and 2 retries per pipeline stage, so the agent never hangs indefinitely.
- **Graceful degradation** — if live exploration can't reproduce a bug in budget, the orchestrator transitions to `FALLBACK_RECORDING` and serves a pre-verified spec, transparently rather than silently.
- **Compiled, not just generated** — every codegen output is validated with `tsc` before it ever reaches the verifier, with one automatic retry on type errors.
- **Determinism over speed** — the verifier runs each spec 3× headlessly with zero Playwright-level retries; a test isn't "passing" until it agrees with itself three times in a row.
- **Minimal, explainable healing** — the healer patches only the broken locator, using a fresh accessibility snapshot, and attaches a plain-English rationale to the diff for review — it never rewrites assertions or regenerates the whole spec.
- **Offline-friendly** — without `ANTHROPIC_API_KEY`, the pipeline runs on deterministic local heuristics instead of failing outright.

## API

Start a pipeline run over REST:

```bash
curl -X POST http://localhost:3000/api/run \
  -H "Content-Type: application/json" \
  -d '{"bugReport":"Empty cart checkout shows error","targetUrl":"http://localhost:3001"}'
```

Live progress is streamed over Socket.IO with the events `pipeline:start`, `pipeline:event`, `pipeline:end`, and `pipeline:error` — this is what the dashboard subscribes to for its stage-by-stage view.

## Repository Layout

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

## Tech Stack

TypeScript · Node.js · Express · Socket.IO · React · Vite · Tailwind CSS · Playwright · Anthropic Claude API

## License

MIT — hackathon project.

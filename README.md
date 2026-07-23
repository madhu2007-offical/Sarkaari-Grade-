# Sarkaari-Grade QA Agent

Autonomous browser QA agent for hackathon demos: **natural-language bug report → explore live app → reproduce → generate Playwright spec → verify → self-heal selectors**.

## Architecture

```
IDLE → EXPLORING → REPRODUCING → CODIFYING → VERIFYING → PASS → DONE
                                    ↓ fail
                                 HEALING → VERIFYING
                                    ↓ max retries / timeout
                            FALLBACK_RECORDING → DONE
```

| Module | Purpose |
|--------|---------|
| `demo-app` | Seeded buggy e-commerce app |  
| `agent` | Claude-powered reproduction via accessibility tree |
| `codegen` | Trace → Playwright `.spec.ts` (role/text locators) |
| `verifier` | Run spec 3× for determinism |
| `healer` | Semantic selector relocation |
| `orchestrator` | State machine + Express + Socket.IO |
| `dashboard` | React/Vite/Tailwind live pipeline UI |
| `fallback` | Pre-verified spec + trace for demo resilience |
| `traces` | JSON reproduction traces |
| `generated` | Output Playwright specs |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright browsers
npx playwright install chromium

# 3. Configure API key
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY if you want Claude-powered reasoning

# 4. Start full demo (demo-app + orchestrator + dashboard)
npm run demo
```

Open **http://localhost:5173** for the dashboard, **http://localhost:3001** for the demo app.

## Demo App Bugs

1. **Empty cart checkout** — clicking Checkout with empty cart throws/shows error (`Cannot checkout: cart is empty`)
2. **Contact form silent fail** — submits without validating required Name field
3. **Heal demo** — append `?breakSelector=checkout` to rename Checkout → "Proceed to Payment"

## Test Modules Standalone

```bash
# Demo app only
npm run start -w demo-app

# Agent reproduction (requires demo-app running + ANTHROPIC_API_KEY)
npm run agent -- "When I click Checkout with an empty cart, the app shows an error" http://localhost:3001

# Codegen from latest trace
npm run codegen

# Codegen from specific trace
npm run codegen -- traces/trace-123.json

# Verifier (requires demo-app running + generated spec)
npm run verify

# Verifier with specific spec
npm run verify -- generated/bug-123.spec.ts

# Healer (broken selector demo)
npm run heal -- generated/bug-123.spec.ts "locator.click: Timeout"

# Orchestrator API only
npm run orchestrator

# Dashboard only
npm run start -w dashboard
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | — | Optional; the pipeline falls back to deterministic local heuristics if it is not set |
| `DEMO_APP_PORT` | 3001 | Demo app port |
| `ORCHESTRATOR_PORT` | 3000 | Orchestrator API/WebSocket |
| `DASHBOARD_PORT` | 5173 | Vite dev server |
| `DEMO_APP_URL` | http://localhost:3001 | Target URL for agent |

## Key Design Decisions

- **Accessibility tree first** — agent uses `page.accessibility.snapshot()`, not screenshots (Claude `claude-sonnet-4-6`)
- **45s timeout / 2 retries** per pipeline stage, then fallback to pre-verified assets
- **Max 12 agent steps** with structured JSON actions
- **Codegen validates with `tsc`**, retries once on TypeScript errors
- **Verifier runs 3×** with zero Playwright retries for determinism check
- **Healer** fetches live accessibility tree and applies minimal locator patches

## API

```bash
# Start pipeline via REST
curl -X POST http://localhost:3000/api/run \
  -H "Content-Type: application/json" \
  -d '{"bugReport":"Empty cart checkout shows error","targetUrl":"http://localhost:3001"}'
```

WebSocket events: `pipeline:start`, `pipeline:event`, `pipeline:end`, `pipeline:error`

## License

MIT — Hackathon project

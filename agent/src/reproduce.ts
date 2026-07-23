import "../../shared/env.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { launchBrowser, getAccessibilitySnapshot, hashSnapshot } from "./snapshot.js";
import { ReproductionAgent, MAX_STEPS } from "./agent.js";
import { ReproductionTrace } from "../../shared/types.js";
import { hasAnthropicApiKey, inferBugKind } from "../../shared/fallback.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TRACES_DIR = path.resolve(__dirname, "../../traces");

async function getSymptomPresence(page: any, bugReport: string): Promise<boolean> {
  const bodyText = (await page.locator("body").innerText()).toLowerCase();
  if (bugReport.toLowerCase().includes("checkout") || bugReport.toLowerCase().includes("cart")) {
    return /cart is empty|cannot checkout|error/i.test(bodyText);
  }
  if (bugReport.toLowerCase().includes("contact") || bugReport.toLowerCase().includes("name")) {
    return /submitted|required|validation/i.test(bodyText);
  }
  return false;
}

async function runFallbackReproduction(
  bugReport: string,
  targetUrl: string,
  browser: any,
  trace: ReproductionTrace
): Promise<void> {
  const page = await browser.newPage();
  const kind = inferBugKind(bugReport, targetUrl);
  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });

  for (let i = 1; i <= MAX_STEPS; i++) {
    let action: any;
    if (kind === "checkout") {
      const checkoutButton = page.getByRole("button", { name: /checkout/i });
      if (await checkoutButton.count()) {
        action = { type: "click", role: "button", name: "Checkout" };
      } else {
        action = { type: "done", summary: "Checkout control not found", reproduced: false };
      }
    } else if (kind === "contact") {
      const submitButton = page.getByRole("button", { name: /submit/i });
      if (await submitButton.count()) {
        action = { type: "click", role: "button", name: "Submit contact form" };
      } else {
        action = { type: "done", summary: "Submit contact form button not found", reproduced: false };
      }
    } else {
      action = { type: "done", summary: "Fallback heuristics did not identify a matching bug pattern", reproduced: false };
    }

    trace.steps.push({
      step: i,
      reasoning: `Fallback heuristic: ${
        kind === "checkout"
          ? "click checkout to surface the bug"
          : kind === "contact"
          ? "submit contact form without name field"
          : "inspect form state"
      }`,
      action,
      snapshotHash: hashSnapshot(await getAccessibilitySnapshot(page)),
    });

    if (action.type === "done") {
      trace.reproduced = action.reproduced;
      trace.finalSummary = action.summary;
      break;
    }

    if (action.type === "click") {
      await page.getByRole(action.role as any, { name: action.name }).click();
      const symptom = await getSymptomPresence(page, bugReport);
      if (symptom) {
        trace.reproduced = true;
        trace.finalSummary = `Fallback heuristic reproduced the bug: ${bugReport}`;
        break;
      }
    }
  }

  await page.close();
}

export async function reproduceBug(
  bugReport: string,
  targetUrl: string
): Promise<ReproductionTrace> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const id = `trace-${Date.now()}`;
  const trace: ReproductionTrace = {
    id,
    bugReport,
    targetUrl,
    startedAt: new Date().toISOString(),
    reproduced: false,
    steps: [],
    finalSummary: "",
  };

  const browser = await launchBrowser(true);

  try {
    if (!hasAnthropicApiKey()) {
      await runFallbackReproduction(bugReport, targetUrl, browser, trace);
    } else {
      const page = await browser.newPage();
      const agent = new ReproductionAgent(apiKey!);
      await page.goto(targetUrl, { waitUntil: "domcontentloaded" });

      for (let i = 1; i <= MAX_STEPS; i++) {
        const action = await agent.decideNext(bugReport, page, i);
        trace.steps = agent.getSteps();

        if (action.type === "done") {
          trace.reproduced = action.reproduced;
          trace.finalSummary = action.summary;
          break;
        }

        await agent.executeAction(page, action);
        trace.steps = agent.getSteps();

        if (i === MAX_STEPS) {
          trace.finalSummary = "Max steps reached without explicit done";
        }
      }

      if (!trace.finalSummary && trace.steps.length > 0) {
        const last = trace.steps[trace.steps.length - 1];
        trace.finalSummary = last.reasoning;
      }

      await page.close();
    }
  } catch (err) {
    trace.error = err instanceof Error ? err.message : String(err);
    trace.finalSummary = `Failed: ${trace.error}`;
  } finally {
    trace.completedAt = new Date().toISOString();
    await browser.close();
  }

  fs.mkdirSync(TRACES_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(TRACES_DIR, `${id}.json`),
    JSON.stringify(trace, null, 2)
  );

  return trace;
}

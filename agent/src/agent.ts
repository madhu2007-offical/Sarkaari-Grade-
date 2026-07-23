import Anthropic from "@anthropic-ai/sdk";
import { Page, Locator } from "playwright";
import { AgentAction, AgentStep } from "../../shared/types.js";
import { getAccessibilitySnapshot, hashSnapshot, truncateSnapshot } from "./snapshot.js";

const MODEL = "claude-sonnet-4-6";
const MAX_STEPS = 12;

const SYSTEM_PROMPT = `You are a QA reproduction agent. You explore web apps using accessibility tree snapshots (NOT screenshots).

Given a bug report and current page accessibility snapshot, decide the next action to reproduce the bug.

Respond ONLY with valid JSON:
{
  "reasoning": "brief explanation",
  "action": {
    "type": "navigate|click|fill|press|wait|assert_text|done",
    ...fields based on type
  }
}

Action types:
- navigate: { "type": "navigate", "url": "http://..." }
- click: { "type": "click", "role": "button", "name": "Checkout" }
- fill: { "type": "fill", "role": "textbox", "name": "Name", "value": "test" }
- press: { "type": "press", "key": "Enter" }
- wait: { "type": "wait", "ms": 1000 }
- assert_text: { "type": "assert_text", "text": "error message", "present": true }
- done: { "type": "done", "summary": "...", "reproduced": true|false }

Use role+name from accessibility tree. Max ${MAX_STEPS} steps total. Call done when bug is reproduced or unrecoverable.`;

export class ReproductionAgent {
  private client: Anthropic;
  private steps: AgentStep[] = [];

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  getSteps(): AgentStep[] {
    return this.steps;
  }

  async decideNext(
    bugReport: string,
    page: Page,
    stepNum: number
  ): Promise<AgentAction> {
    const snapshot = await getAccessibilitySnapshot(page);
    const truncated = truncateSnapshot(snapshot);

    const history = this.steps
      .map((s) => `Step ${s.step}: ${s.reasoning} → ${JSON.stringify(s.action)}`)
      .join("\n");

    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Bug report: ${bugReport}
Current URL: ${page.url()}
Step: ${stepNum}/${MAX_STEPS}

Previous steps:
${history || "(none)"}

Accessibility snapshot:
${truncated}

What is the next action? Respond with JSON only.`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Agent returned non-JSON response");

    const parsed = JSON.parse(jsonMatch[0]) as {
      reasoning: string;
      action: AgentAction;
    };

    this.steps.push({
      step: stepNum,
      action: parsed.action,
      reasoning: parsed.reasoning,
      snapshotHash: hashSnapshot(snapshot),
    });

    return parsed.action;
  }

  async executeAction(page: Page, action: AgentAction): Promise<void> {
    const byRole = (role: string, name: string): Locator =>
      page.getByRole(role as Parameters<Page["getByRole"]>[0], { name });

    switch (action.type) {
      case "navigate":
        await page.goto(action.url, { waitUntil: "domcontentloaded" });
        break;
      case "click":
        await byRole(action.role, action.name).click();
        break;
      case "fill":
        await byRole(action.role, action.name).fill(action.value);
        break;
      case "press":
        await page.keyboard.press(action.key);
        break;
      case "wait":
        await page.waitForTimeout(action.ms);
        break;
      case "assert_text":
        if (action.present) {
          await page.getByText(action.text).waitFor({ timeout: 5000 });
        }
        break;
      case "done":
        break;
    }
  }
}

export { MAX_STEPS };

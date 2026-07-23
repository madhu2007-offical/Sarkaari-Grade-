import Anthropic from "@anthropic-ai/sdk";
import { chromium } from "playwright";
import fs from "fs";
import { HealResult } from "../../shared/types.js";
import { hasAnthropicApiKey } from "../../shared/fallback.js";

const MODEL = "claude-sonnet-4-6";

async function launchBrowserWithFallback(headless = true) {
  const baseOptions = { headless } as Parameters<typeof chromium.launch>[0];
  try {
    return await chromium.launch({ ...baseOptions, channel: "chrome" as const });
  } catch {
    return chromium.launch(baseOptions);
  }
}

function computeDiff(oldContent: string, newContent: string): string {
  const oldLines = oldContent.split("\n");
  const newLines = newContent.split("\n");
  const diff: string[] = [];

  const maxLen = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];
    if (oldLine === newLine) continue;
    if (oldLine !== undefined) diff.push(`- ${oldLine}`);
    if (newLine !== undefined) diff.push(`+ ${newLine}`);
  }
  return diff.join("\n") || "(no line changes)";
}

function patchSpecFallback(specContent: string): string {
  return specContent
    .replace(/name: \/checkout\/i/g, 'name: /checkout|Proceed to Payment/i')
    .replace(/name: \/submit\/i/g, 'name: /submit|Submit/i')
    .replace(/getByRole\("button", \{ name: "Checkout" \}\)/g, 'getByRole("button", { name: /checkout|Proceed to Payment/i })')
    .replace(/getByRole\("button", \{ name: "Submit" \}\)/g, 'getByRole("button", { name: /submit|Submit/i })');
}

export async function healSpec(
  specPath: string,
  specContent: string,
  targetUrl: string,
  failureMessage: string
): Promise<HealResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!hasAnthropicApiKey()) {
    const newSpecContent = patchSpecFallback(specContent);
    const diff = computeDiff(specContent, newSpecContent);
    fs.writeFileSync(specPath, newSpecContent);
    return {
      patched: newSpecContent !== specContent,
      diff,
      explanation: "The checkout control's accessible name changed, so the locator now matches either the original label or the updated text.",
      newSpecContent,
    };
  }

  const browser = await launchBrowserWithFallback(true);
  const page = await browser.newPage();
  let snapshot = "";

  try {
    await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
    const accessibility = (page as typeof page & { accessibility?: { snapshot?: (options?: { interestingOnly?: boolean }) => Promise<unknown> } }).accessibility;
    const snap = accessibility?.snapshot ? await accessibility.snapshot({ interestingOnly: false }) : null;
    snapshot = JSON.stringify(snap ?? {}, null, 0).slice(0, 10000);
  } finally {
    await browser.close();
  }

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: `You heal broken Playwright test selectors using semantic relocation.

Given a failing spec, error message, and current page accessibility tree:
- Apply MINIMAL patch — only change broken locators
- Prefer getByRole/getByText with semantic names from accessibility tree
- Output JSON only: { "patched": true|false, "specContent": "...", "explanation": "..." }`,
    messages: [
      {
        role: "user",
        content: `Failing spec (${specPath}):
\`\`\`
${specContent}
\`\`\`

Failure: ${failureMessage}
Target URL: ${targetUrl}

Current accessibility snapshot:
${snapshot}

Heal the spec with minimal changes. Respond with JSON only.`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { patched: false, diff: "", explanation: "Healer returned non-JSON" };
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    patched: boolean;
    specContent?: string;
    explanation: string;
  };

  if (!parsed.patched || !parsed.specContent) {
    return { patched: false, diff: "", explanation: parsed.explanation };
  }

  const diff = computeDiff(specContent, parsed.specContent);
  fs.writeFileSync(specPath, parsed.specContent);

  return {
    patched: true,
    diff,
    explanation: parsed.explanation,
    newSpecContent: parsed.specContent,
  };
}

import "../../shared/env.js";
import Anthropic from "@anthropic-ai/sdk";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ReproductionTrace, CodegenResult } from "../../shared/types.js";
import { hasAnthropicApiKey, inferBugKind } from "../../shared/fallback.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GENERATED_DIR = path.resolve(__dirname, "../../generated");
const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You generate Playwright test specs in TypeScript from reproduction traces.

Rules:
- Use @playwright/test imports
- Prefer getByRole with name, getByText locators — NO CSS selectors unless unavoidable
- Include test.describe and test() blocks
- Base URL from trace targetUrl
- Assert the bug behavior (error shown, silent fail, etc.)
- Output ONLY the complete .spec.ts file content, no markdown fences`;

function validateSpec(specContent: string, specPath: string): { valid: boolean; errors: string[] } {
  const tmpDir = path.join(GENERATED_DIR, ".validate");
  fs.mkdirSync(tmpDir, { recursive: true });

  const specFile = path.join(tmpDir, "test.spec.ts");
  const tsconfig = {
    compilerOptions: {
      target: "ES2022",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      types: ["node", "@playwright/test"],
    },
    include: ["*.ts"],
  };

  fs.writeFileSync(specFile, specContent);
  fs.writeFileSync(path.join(tmpDir, "tsconfig.json"), JSON.stringify(tsconfig, null, 2));

  try {
    execSync(`npx tsc --noEmit -p "${path.join(tmpDir, "tsconfig.json")}"`, {
      cwd: tmpDir,
      stdio: "pipe",
      timeout: 30000,
    });
    return { valid: true, errors: [] };
  } catch (err: unknown) {
    const message = err instanceof Error && "stdout" in err
      ? String((err as { stdout?: unknown }).stdout) + String((err as { stderr?: unknown }).stderr)
      : String(err);
    return { valid: false, errors: [message] };
  }
}

function generateFallbackSpec(trace: ReproductionTrace): string {
  const kind = inferBugKind(trace.bugReport, trace.targetUrl);
  if (kind === "checkout") {
    return `import { test, expect } from "@playwright/test";

test.describe("Empty cart checkout bug", () => {
  test("shows error when checking out empty cart", async ({ page }) => {
    const baseUrl = process.env.BASE_URL || process.env.DEMO_APP_URL || "http://localhost:3001";
    await page.goto(baseUrl);
    await page.getByRole("button", { name: "Checkout" }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByText(/cart is empty|cannot checkout/i)).toBeVisible();
  });
});`;
  }

  if (kind === "contact") {
    return `import { test, expect } from "@playwright/test";

test.describe("Contact form silent fail bug", () => {
  test("submits contact form without required name", async ({ page }) => {
    const baseUrl = process.env.BASE_URL || process.env.DEMO_APP_URL || "http://localhost:3001";
    await page.goto(baseUrl);
    await page.getByRole("button", { name: "Submit contact form" }).click();
    await expect(page.getByText(/Submitted! Name received:/i)).toBeVisible();
  });
});`;
  }

  return `import { test, expect } from "@playwright/test";

test.describe("Fallback QA spec", () => {
  test("captures the reported UI issue", async ({ page }) => {
    const baseUrl = process.env.BASE_URL || process.env.DEMO_APP_URL || "http://localhost:3001";
    await page.goto(baseUrl);
    await expect(page.getByText(/contact|checkout|error/i)).toBeVisible();
  });
});`;
}

export async function generateSpec(trace: ReproductionTrace): Promise<CodegenResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const client = hasAnthropicApiKey() ? new Anthropic({ apiKey: apiKey! }) : null;
  const specName = `bug-${trace.id.replace("trace-", "")}.spec.ts`;
  const specPath = path.join(GENERATED_DIR, specName);

  const stepsText = trace.steps
    .map((s) => `${s.step}. ${s.reasoning} → ${JSON.stringify(s.action)}`)
    .join("\n");

  if (!client) {
    const specContent = generateFallbackSpec(trace);
    const specPath = path.join(GENERATED_DIR, specName);
    fs.mkdirSync(GENERATED_DIR, { recursive: true });
    fs.writeFileSync(specPath, specContent);
    return { specPath, specContent, valid: true };
  }

  async function callCodegen(errorFeedback?: string): Promise<string> {
    if (!client) throw new Error("Anthropic client unavailable");
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Bug report: ${trace.bugReport}
Target URL: ${trace.targetUrl}
Reproduced: ${trace.reproduced}
Summary: ${trace.finalSummary}

Reproduction steps:
${stepsText}
${errorFeedback ? `\nPrevious attempt had TypeScript errors:\n${errorFeedback}\nFix and regenerate.` : ""}

Generate the Playwright spec file.`,
        },
      ],
    });

    let text = response.content[0].type === "text" ? response.content[0].text : "";
    text = text.replace(/^```typescript?\n?/m, "").replace(/\n?```$/m, "").trim();
    return text;
  }

  let specContent = await callCodegen();
  let validation = validateSpec(specContent, specPath);

  if (!validation.valid) {
    specContent = await callCodegen(validation.errors.join("\n"));
    validation = validateSpec(specContent, specPath);
  }

  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  fs.writeFileSync(specPath, specContent);

  return {
    specPath,
    specContent,
    valid: validation.valid,
    errors: validation.errors.length ? validation.errors : undefined,
  };
}

export function generateSpecFromTraceFile(tracePath: string): Promise<CodegenResult> {
  const trace = JSON.parse(fs.readFileSync(tracePath, "utf-8")) as ReproductionTrace;
  return generateSpec(trace);
}

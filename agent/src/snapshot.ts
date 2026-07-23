import { chromium, Page } from "playwright";
import crypto from "crypto";

function getAccessibilityApi(page: Page) {
  return (page as Page & { accessibility?: { snapshot?: (options?: { interestingOnly?: boolean }) => Promise<unknown> } }).accessibility;
}

export async function getAccessibilitySnapshot(page: Page): Promise<string> {
  const accessibility = getAccessibilityApi(page);
  try {
    const snapshot = accessibility?.snapshot ? await accessibility.snapshot({ interestingOnly: false }) : null;
    return JSON.stringify(snapshot ?? {}, null, 0);
  } catch {
    const bodyText = (await page.locator("body").innerText()).trim();
    return JSON.stringify({ fallbackText: bodyText, note: "Accessibility snapshot unavailable" }, null, 0);
  }
}

export function hashSnapshot(snapshot: string): string {
  return crypto.createHash("sha256").update(snapshot).digest("hex").slice(0, 12);
}

export async function launchBrowser(headless = true) {
  const baseOptions = { headless } as Parameters<typeof chromium.launch>[0];
  try {
    return await chromium.launch({ ...baseOptions, channel: "chrome" as const });
  } catch {
    return chromium.launch(baseOptions);
  }
}

export function truncateSnapshot(snapshot: string, maxLen = 12000): string {
  if (snapshot.length <= maxLen) return snapshot;
  return snapshot.slice(0, maxLen) + "\n... [truncated]";
}

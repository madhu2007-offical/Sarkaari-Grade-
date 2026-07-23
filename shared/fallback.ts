export function hasAnthropicApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim());
}

export function inferBugKind(bugReport: string, targetUrl: string): "checkout" | "contact" | "generic" {
  const haystack = `${bugReport}\n${targetUrl}`.toLowerCase();
  if (haystack.includes("checkout") || haystack.includes("cart")) return "checkout";
  if (haystack.includes("contact") || haystack.includes("name") || haystack.includes("form")) return "contact";
  return "generic";
}

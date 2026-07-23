import "../../shared/env.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { healSpec } from "./heal.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rawSpecPath = process.argv[2];
const specPath = rawSpecPath
  ? (path.isAbsolute(rawSpecPath) ? rawSpecPath : path.resolve(repoRoot, rawSpecPath))
  : undefined;
const failureMsg = process.argv[3] || "Selector not found — element may have changed";
const targetUrl = process.env.DEMO_APP_URL || "http://localhost:3001?breakSelector=checkout";

if (!specPath) {
  console.error("Usage: npm run heal -- <spec-path> [failure-message]");
  process.exit(1);
}

const specContent = fs.readFileSync(specPath, "utf-8");

console.log("Healer — semantic selector relocation");
console.log(`Spec: ${specPath}`);
console.log(`URL: ${targetUrl}\n`);

healSpec(specPath, specContent, targetUrl, failureMsg)
  .then((result) => {
    console.log(`Patched: ${result.patched}`);
    console.log(`Explanation: ${result.explanation}`);
    if (result.diff) console.log(`\nDiff:\n${result.diff}`);
    process.exit(result.patched ? 0 : 1);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

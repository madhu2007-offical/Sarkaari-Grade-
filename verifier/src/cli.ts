import "dotenv/config";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { verifySpec } from "./verify.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rawSpecPath = process.argv[2] || (() => {
  const genDir = path.join(repoRoot, "generated");
  const files = fs.readdirSync(genDir).filter((f) => f.endsWith(".spec.ts"));
  if (!files.length) throw new Error("No spec files in generated/");
  return path.join(genDir, files.sort().reverse()[0]);
})();
const specPath = path.isAbsolute(rawSpecPath)
  ? rawSpecPath
  : path.resolve(repoRoot, rawSpecPath);

const baseUrl = process.env.DEMO_APP_URL || "http://localhost:3001";

console.log("Verifier — running spec 3x for determinism");
console.log(`Spec: ${specPath}`);
console.log(`Base URL: ${baseUrl}\n`);

verifySpec(specPath, baseUrl)
  .then((result) => {
    console.log(`Passed: ${result.passed}`);
    console.log(`Successes: ${result.successes}/${result.runs}`);
    if (result.failures.length) {
      console.error("Failures:");
      result.failures.forEach((f) => console.error(f));
    }
    process.exit(result.passed ? 0 : 1);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

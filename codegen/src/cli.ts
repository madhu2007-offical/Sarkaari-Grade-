import "../../shared/env.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { generateSpecFromTraceFile } from "./generate.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rawTracePath = process.argv[2] || (() => {
  const tracesDir = path.join(repoRoot, "traces");
  const files = fs.readdirSync(tracesDir).filter((f) => f.endsWith(".json"));
  if (!files.length) throw new Error("No trace files in traces/");
  return path.join(tracesDir, files.sort().reverse()[0]);
})();
const tracePath = path.isAbsolute(rawTracePath)
  ? rawTracePath
  : path.resolve(repoRoot, rawTracePath);

console.log("Codegen — generating Playwright spec from trace");
console.log(`Trace: ${tracePath}\n`);

generateSpecFromTraceFile(tracePath)
  .then((result) => {
    console.log(`Spec: ${result.specPath}`);
    console.log(`Valid: ${result.valid}`);
    if (result.errors) console.error("Errors:", result.errors);
    process.exit(result.valid ? 0 : 1);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

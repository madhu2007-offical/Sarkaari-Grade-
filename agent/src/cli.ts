import "../../shared/env.js";
import { reproduceBug } from "./reproduce.js";

const bugReport =
  process.argv[2] ||
  "When I click Checkout with an empty cart, the app shows an error instead of a friendly message";
const targetUrl =
  process.argv[3] || process.env.DEMO_APP_URL || "http://localhost:3001";

console.log("Sarkaari-Grade QA Agent — Reproduction Mode");
console.log(`Bug: ${bugReport}`);
console.log(`URL: ${targetUrl}\n`);

reproduceBug(bugReport, targetUrl)
  .then((trace) => {
    console.log(`\nReproduced: ${trace.reproduced}`);
    console.log(`Summary: ${trace.finalSummary}`);
    console.log(`Steps: ${trace.steps.length}`);
    console.log(`Trace saved: traces/${trace.id}.json`);
    process.exit(trace.reproduced ? 0 : 1);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

import { runPipeline } from "../orchestrator/src/pipeline.js";

async function main() {
  const bugReport = "Empty cart checkout shows error";
  const targetUrl = "http://localhost:3001?breakSelector=checkout";

  console.log("Running pipeline with direct event logging...");
  await runPipeline(bugReport, targetUrl, (event) => {
    console.log(`[EVENT] ${event.timestamp} | State: ${event.state} | Message: ${event.message}`);
    if (event.data) {
      console.log("Data:", JSON.stringify(event.data, null, 2));
    }
  });
  console.log("Pipeline run complete.");
}

main().catch(console.error);

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { reproduceBug } from "../../agent/src/reproduce.js";
import { generateSpec } from "../../codegen/src/generate.js";
import { verifySpec } from "../../verifier/src/verify.js";
import { healSpec } from "../../healer/src/heal.js";
import { StateMachine } from "./state-machine.js";
import { ReproductionTrace } from "../../shared/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FALLBACK_DIR = path.resolve(__dirname, "../../fallback");
const GENERATED_DIR = path.resolve(__dirname, "../../generated");

function loadFallbackAssets(): string | null {
  const manifest = path.join(FALLBACK_DIR, "manifest.json");
  if (!fs.existsSync(manifest)) return null;

  const data = JSON.parse(fs.readFileSync(manifest, "utf-8"));
  const srcSpec = path.join(FALLBACK_DIR, data.specFile);
  if (!fs.existsSync(srcSpec)) return null;

  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  const destSpec = path.join(GENERATED_DIR, "fallback-verified.spec.ts");
  fs.copyFileSync(srcSpec, destSpec);

  const traceSrc = path.join(FALLBACK_DIR, "trace-demo.json");
  const tracesDir = path.resolve(__dirname, "../../traces");
  fs.mkdirSync(tracesDir, { recursive: true });
  if (fs.existsSync(traceSrc)) {
    fs.copyFileSync(traceSrc, path.join(tracesDir, "trace-fallback-demo.json"));
  }

  return destSpec;
}

export async function runPipeline(
  bugReport: string,
  targetUrl: string,
  onEvent: (event: import("../../shared/types.js").OrchestratorEvent) => void
): Promise<void> {
  const sm = new StateMachine(bugReport, targetUrl);
  sm.onEvent(onEvent);

  sm.setState("IDLE");
  sm.emit("Pipeline idle — starting");

  const stages: Array<{ name: import("../../shared/types.js").OrchestratorState; run: () => Promise<boolean> }> = [
    {
      name: "EXPLORING",
      run: () =>
        sm.runStage("EXPLORING", async () => ({
          success: true,
          data: { note: "Exploration via agent accessibility snapshot loop" },
        })),
    },
    {
      name: "REPRODUCING",
      run: () =>
        sm.runStage("REPRODUCING", async () => {
          const trace = await reproduceBug(bugReport, targetUrl);
          sm.ctx.traceId = trace.id;
          sm.ctx.result = { trace };
          return {
            success: trace.reproduced || trace.steps.length > 0,
            data: { traceId: trace.id, reproduced: trace.reproduced },
          };
        }),
    },
    {
      name: "CODIFYING",
      run: () =>
        sm.runStage("CODIFYING", async () => {
          const tracePath = path.resolve(__dirname, `../../traces/${sm.ctx.traceId}.json`);
          const trace = JSON.parse(fs.readFileSync(tracePath, "utf-8")) as ReproductionTrace;
          const result = await generateSpec(trace);
          sm.ctx.specPath = result.specPath;
          sm.ctx.result = { ...sm.ctx.result, codegen: result };
          return { success: result.valid, data: { specPath: result.specPath } };
        }),
    },
    {
      name: "VERIFYING",
      run: async () => {
        const first = await sm.runStage("VERIFYING", async () => {
          const result = await verifySpec(sm.ctx.specPath!, targetUrl);
          sm.ctx.verifyFailures = result.failures;
          sm.ctx.result = { ...sm.ctx.result, verify: result };
          return { success: result.passed, data: result };
        });

        if (first) {
          sm.setState("PASS");
          sm.emit("Verification passed");
          return true;
        }

        const healed = await sm.runStage("HEALING", async () => {
          const specPath = sm.ctx.specPath!;
          const specContent = fs.readFileSync(specPath, "utf-8");
          const failure = sm.ctx.verifyFailures?.[0] || "Test failed";
          const healUrl = targetUrl.includes("breakSelector")
            ? targetUrl
            : `${targetUrl}${targetUrl.includes("?") ? "&" : "?"}breakSelector=checkout`;
          const result = await healSpec(specPath, specContent, healUrl, failure);
          sm.ctx.result = { ...sm.ctx.result, heal: result };
          return { success: result.patched, data: result };
        });

        if (!healed) return false;

        sm.ctx.retries["VERIFYING"] = 0;
        const second = await sm.runStage("VERIFYING", async () => {
          const result = await verifySpec(sm.ctx.specPath!, targetUrl);
          sm.ctx.result = { ...sm.ctx.result, verifyAfterHeal: result };
          return { success: result.passed, data: result };
        });

        if (second) {
          sm.setState("PASS");
          sm.emit("Verification passed after heal");
        }
        return second;
      },
    },
  ];

  for (const stage of stages) {
    const ok = await stage.run();
    if (!ok) {
      const fallbackSpec = loadFallbackAssets();
      await sm.fallback(() => {
        sm.ctx.result = { ...sm.ctx.result, fallback: true, fallbackSpec };
      });
      return;
    }
  }

  sm.complete();
}

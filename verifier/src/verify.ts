import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { VerifyResult } from "../../shared/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUNS = 3;

export async function verifySpec(
  specPath: string,
  baseUrl?: string
): Promise<VerifyResult> {
  const absSpec = path.resolve(specPath).replace(/\\/g, "/");
  if (!fs.existsSync(absSpec)) {
    return { passed: false, runs: 0, successes: 0, failures: [`Spec not found: ${absSpec}`] };
  }

  const failures: string[] = [];
  let successes = 0;

  for (let run = 1; run <= RUNS; run++) {
    try {
      const env = { ...process.env };
      if (baseUrl) env.BASE_URL = baseUrl;

      execSync(
        `npx playwright test "${absSpec}" --reporter=line`,
        {
          cwd: path.resolve(__dirname, "../.."),
          stdio: "pipe",
          timeout: 60000,
          env,
        }
      );
      successes++;
    } catch (err: unknown) {
      const msg = err instanceof Error && "stdout" in err
        ? String((err as { stdout?: Buffer }).stdout) + String((err as { stderr?: Buffer }).stderr)
        : String(err);
      failures.push(`Run ${run}: ${msg.slice(0, 500)}`);
    }
  }

  return {
    passed: successes === RUNS,
    runs: RUNS,
    successes,
    failures,
  };
}

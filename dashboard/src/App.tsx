import { useState } from "react";
import { usePipeline } from "./usePipeline";
import { StateMachineView } from "./StateMachineView";

const PRESETS = [
  {
    label: "Empty cart checkout error",
    report:
      "When I click Checkout with an empty cart, the app shows an error instead of a friendly message",
    url: "http://localhost:3001",
  },
  {
    label: "Contact form silent fail",
    report:
      "The contact form submits successfully even when the required Name field is left empty — no validation error shown",
    url: "http://localhost:3001#contact",
  },
  {
    label: "Heal demo (broken selector)",
    report:
      "Checkout button fails to click — selector may have changed to 'Proceed to Payment'",
    url: "http://localhost:3001?breakSelector=checkout",
  },
];

export default function App() {
  const { connected, running, events, currentState, startPipeline } = usePipeline();
  const [bugReport, setBugReport] = useState(PRESETS[0].report);
  const [targetUrl, setTargetUrl] = useState(PRESETS[0].url);
  const [error, setError] = useState("");

  const handleStart = async () => {
    setError("");
    try {
      await startPipeline(bugReport, targetUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="min-h-screen">
      <header className="bg-sarkaari-900 text-white px-6 py-4 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">🏛️ Sarkaari-Grade QA Agent</h1>
            <p className="text-sarkaari-50 text-sm mt-1">
              NL bug report → explore → reproduce → codegen → verify → heal
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                connected ? "bg-green-400" : "bg-red-400"
              }`}
            />
            <span className="text-sm">{connected ? "Connected" : "Disconnected"}</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Bug Report</h2>

          <div className="flex flex-wrap gap-2 mb-4">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => {
                  setBugReport(p.report);
                  setTargetUrl(p.url);
                }}
                className="px-3 py-1 text-xs bg-sarkaari-50 text-sarkaari-700 rounded-full hover:bg-sarkaari-500 hover:text-white transition"
              >
                {p.label}
              </button>
            ))}
          </div>

          <textarea
            value={bugReport}
            onChange={(e) => setBugReport(e.target.value)}
            rows={3}
            className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-sarkaari-500 focus:outline-none"
            placeholder="Describe the bug in natural language..."
          />

          <input
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            className="w-full mt-3 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-sarkaari-500 focus:outline-none"
            placeholder="Target URL"
          />

          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

          <button
            onClick={handleStart}
            disabled={running || !connected}
            className="mt-4 px-6 py-2.5 bg-sarkaari-700 text-white rounded-lg font-medium hover:bg-sarkaari-900 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {running ? "Pipeline Running..." : "Start QA Pipeline"}
          </button>
        </section>

        <StateMachineView currentState={currentState} events={events} />

        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-2">Architecture</h2>
          <pre className="text-xs bg-slate-900 text-green-400 p-4 rounded-lg overflow-x-auto">
{`IDLE → EXPLORING → REPRODUCING → CODIFYING → VERIFYING
                                      ↓ fail
                                   HEALING → VERIFYING
                                      ↓ max retries
                              FALLBACK_RECORDING → DONE`}
          </pre>
          <p className="text-sm text-slate-500 mt-2">
            45s timeout per stage · 2 retries · accessibility-tree agent (no screenshots)
          </p>
        </section>
      </main>
    </div>
  );
}

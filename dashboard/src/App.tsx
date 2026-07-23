import { useState, useEffect } from "react";
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
  const [activeTab, setActiveTab] = useState<"logs" | "report" | "spec">("logs");

  const handleStart = async () => {
    setError("");
    try {
      await startPipeline(bugReport, targetUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  // Find healing or failure data in events
  const healEvent = events.find((e) => e.state === "HEALING" && e.data?.patched);
  const healData = healEvent?.data as { patched: boolean; diff: string; explanation: string; newSpecContent?: string } | undefined;
  
  const verifyFailEvent = events.find((e) => e.state === "VERIFYING" && e.data?.failures && (e.data.failures as string[]).length > 0);
  const verifyFailData = verifyFailEvent?.data as { failures: string[] } | undefined;

  useEffect(() => {
    if (healData) {
      setActiveTab("report");
    } else if (verifyFailData) {
      setActiveTab("logs");
    }
  }, [healData, verifyFailData]);

  return (
    <div className="flex flex-col min-h-screen bg-[#070809] text-zinc-300">
      {/* Sleek Cursor-like Top Header */}
      <header className="border-b border-zinc-800 bg-[#0c0d0e]/80 backdrop-blur-md sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-violet-600 to-indigo-500 p-2 rounded-lg shadow-lg shadow-violet-500/20">
            <span className="text-xl font-bold text-white leading-none">🏛️</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-md font-bold tracking-tight text-white font-mono">SARKAARI-GRADE</span>
              <span className="text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700 px-1.5 py-0.5 rounded font-mono">v1.2.0</span>
            </div>
            <p className="text-[11px] text-zinc-500 font-mono">Autonomous QA Reproduction & Self-Healing Agent</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full relative ${
                connected ? "bg-emerald-400" : "bg-rose-500"
              }`}
            >
              {connected && (
                <span className="absolute -inset-0.5 bg-emerald-400 rounded-full animate-ping opacity-75" />
              )}
            </span>
            <span className="text-xs font-medium text-zinc-400 font-mono">
              {connected ? "Orchestrator Connected" : "Orchestrator Offline"}
            </span>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Control Center (Sidebar Panel) */}
        <section className="lg:col-span-4 space-y-5">
          <div className="border border-zinc-800/80 bg-[#0c0d0e] rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider font-mono">Control Center</h2>
              <span className="h-1.5 w-12 bg-zinc-800 rounded" />
            </div>

            {/* Presets */}
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider font-mono">Quick Bug Presets</label>
              <div className="flex flex-col gap-1.5">
                {PRESETS.map((p) => {
                  const isActive = bugReport === p.report;
                  return (
                    <button
                      key={p.label}
                      onClick={() => {
                        setBugReport(p.report);
                        setTargetUrl(p.url);
                      }}
                      className={`text-left px-3.5 py-2.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
                        isActive
                          ? "bg-violet-950/20 border-violet-800 text-violet-300 shadow-[inset_0_1px_0_rgba(124,58,237,0.1)]"
                          : "bg-zinc-900/30 border-zinc-800 text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-300"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form Inputs */}
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider font-mono">Natural Language Bug Report</label>
                <textarea
                  value={bugReport}
                  onChange={(e) => setBugReport(e.target.value)}
                  rows={4}
                  className="w-full bg-[#070809] border border-zinc-800/80 rounded-lg p-3 text-xs text-zinc-200 placeholder-zinc-600 focus:border-violet-600 focus:ring-1 focus:ring-violet-600 focus:outline-none transition duration-150"
                  placeholder="Describe the bug in plain English..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider font-mono">Target Application URL</label>
                <input
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  className="w-full bg-[#070809] border border-zinc-800/80 rounded-lg p-3 text-xs text-zinc-200 placeholder-zinc-600 focus:border-violet-600 focus:ring-1 focus:ring-violet-600 focus:outline-none transition duration-150"
                  placeholder="Target URL (e.g., http://localhost:3001)"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-950/20 border border-rose-900/50 rounded-lg">
                <p className="text-rose-400 text-xs font-mono">{error}</p>
              </div>
            )}

            {/* Run Button */}
            <button
              onClick={handleStart}
              disabled={running || !connected}
              className={`w-full py-3.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                running
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700"
                  : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-600/20 hover:shadow-violet-600/40 border border-violet-500/20"
              }`}
            >
              {running ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                  Running Pipeline
                </span>
              ) : (
                "Initiate QA Agent"
              )}
            </button>
          </div>

          {/* System Spec Sheet */}
          <div className="border border-zinc-800/80 bg-[#0c0d0e] rounded-xl p-5 shadow-xl space-y-3">
            <h3 className="text-xs font-semibold text-zinc-300 font-mono uppercase tracking-wider">Agent Blueprint</h3>
            <ul className="text-[11px] text-zinc-500 font-mono space-y-2">
              <li className="flex justify-between py-1 border-b border-zinc-900">
                <span>Model Backend</span>
                <span className="text-zinc-300">Claude 3.5 Sonnet</span>
              </li>
              <li className="flex justify-between py-1 border-b border-zinc-900">
                <span>Reasoning Base</span>
                <span className="text-zinc-300">Accessibility Tree</span>
              </li>
              <li className="flex justify-between py-1 border-b border-zinc-900">
                <span>Step Budget</span>
                <span className="text-zinc-300">Max 12 Steps</span>
              </li>
              <li className="flex justify-between py-1 border-b border-zinc-900">
                <span>Stage Timeout</span>
                <span className="text-zinc-300">45 seconds</span>
              </li>
              <li className="flex justify-between py-1">
                <span>Run Assurance</span>
                <span className="text-zinc-300">3x Determinism Check</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Right Side: State Visualizer & Console (Workspace Panel) */}
        <section className="lg:col-span-8 flex flex-col space-y-5">
          
          {/* State Machine Status Flow */}
          <StateMachineView currentState={currentState} events={events} />

          {/* Workspace Tabs Section */}
          <div className="flex-1 flex flex-col border border-zinc-800/80 bg-[#0c0d0e] rounded-xl overflow-hidden shadow-xl min-h-[480px]">
            {/* Tab Headers */}
            <div className="flex items-center justify-between border-b border-zinc-800 bg-[#090a0b] px-4">
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTab("logs")}
                  className={`px-4 py-3 text-xs font-semibold font-mono border-b-2 transition duration-150 ${
                    activeTab === "logs"
                      ? "border-violet-500 text-white bg-zinc-900/30"
                      : "border-transparent text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  CONSOLE
                </button>
                {healData && (
                  <button
                    onClick={() => setActiveTab("report")}
                    className={`px-4 py-3 text-xs font-semibold font-mono border-b-2 transition duration-150 ${
                      activeTab === "report"
                        ? "border-amber-500 text-white bg-zinc-900/30"
                        : "border-transparent text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    HEALING REPORT
                  </button>
                )}
                {healData?.newSpecContent && (
                  <button
                    onClick={() => setActiveTab("spec")}
                    className={`px-4 py-3 text-xs font-semibold font-mono border-b-2 transition duration-150 ${
                      activeTab === "spec"
                        ? "border-emerald-500 text-white bg-zinc-900/30"
                        : "border-transparent text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    HEALED SPEC
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-zinc-800" />
                <span className="w-2 h-2 rounded-full bg-zinc-800" />
                <span className="w-2 h-2 rounded-full bg-zinc-800" />
              </div>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 p-5 bg-[#070809]/50 overflow-y-auto max-h-[500px]">
              
              {/* Tab 1: Terminal Logs */}
              {activeTab === "logs" && (
                <div className="font-mono text-xs space-y-2.5">
                  {events.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-20 text-zinc-600">
                      <p className="text-sm">CONSOLE READY</p>
                      <p className="text-[10px] mt-1 text-zinc-700">Awaiting agent pipeline initiation...</p>
                    </div>
                  ) : (
                    events.map((e, idx) => {
                      const isError = e.message.startsWith("Error");
                      const isSuccess = e.message.includes("succeeded") || e.message.includes("passed");
                      return (
                        <div
                          key={idx}
                          className="flex items-start gap-4 border-b border-zinc-900/50 pb-2 last:border-0"
                        >
                          <span className="text-zinc-600 select-none">
                            {new Date(e.timestamp).toLocaleTimeString()}
                          </span>
                          <span
                            className={`font-semibold shrink-0 ${
                              isError
                                ? "text-rose-400 bg-rose-950/20 px-1 rounded"
                                : isSuccess
                                ? "text-emerald-400 bg-emerald-950/20 px-1 rounded"
                                : "text-violet-400 bg-violet-950/20 px-1 rounded"
                            }`}
                          >
                            [{e.state}]
                          </span>
                          <span
                            className={`${
                              isError ? "text-rose-300" : isSuccess ? "text-zinc-200 font-medium" : "text-zinc-400"
                            }`}
                          >
                            {e.message}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Tab 2: Healing Report */}
              {activeTab === "report" && healData && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-amber-950/10 border border-amber-900/30">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400 font-mono mb-2">
                      Semantic Rationale
                    </h4>
                    <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                      {healData.explanation}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
                      Selector Replacement Diff
                    </h4>
                    <pre className="p-4 rounded-lg bg-[#040405] border border-zinc-800 text-[11px] font-mono text-zinc-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      {healData.diff.split("\n").map((line, i) => {
                        const isDeletion = line.startsWith("-");
                        const isAddition = line.startsWith("+");
                        return (
                          <div
                            key={i}
                            className={`${
                              isDeletion
                                ? "text-rose-400 bg-rose-950/15 -mx-4 px-4"
                                : isAddition
                                ? "text-emerald-400 bg-emerald-950/15 -mx-4 px-4"
                                : "text-zinc-500"
                            }`}
                          >
                            {line}
                          </div>
                        );
                      })}
                    </pre>
                  </div>
                </div>
              )}

              {/* Tab 3: Full Spec Content */}
              {activeTab === "spec" && healData?.newSpecContent && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-semibold text-emerald-400 font-mono">HEALED_PLAYWRIGHT_SPEC.spec.ts</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(healData.newSpecContent || "");
                      }}
                      className="px-2.5 py-1 text-[10px] font-mono bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded transition"
                    >
                      Copy Code
                    </button>
                  </div>
                  <pre className="p-4 rounded-lg bg-[#040405] border border-zinc-800 text-[11px] font-mono text-zinc-300 overflow-x-auto leading-relaxed">
                    {healData.newSpecContent}
                  </pre>
                </div>
              )}

            </div>
          </div>
        </section>

      </main>
    </div>
  );
}

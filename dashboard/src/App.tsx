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

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem("sarkaari_authenticated") === "true";
  });
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  // Light/Dark Theme State
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("sarkaari_theme") as "light" | "dark") || "dark";
  });

  const handleStart = async () => {
    setError("");
    try {
      await startPipeline(bugReport, targetUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "admin") {
      localStorage.setItem("sarkaari_authenticated", "true");
      setIsAuthenticated(true);
      setAuthError("");
    } else {
      setAuthError("Invalid Security Key. Please try again.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("sarkaari_authenticated");
    setIsAuthenticated(false);
    setPassword("");
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("sarkaari_theme", nextTheme);
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

  // Apply theme class to HTML element for Tailwind compatibility
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  // RENDER: Authentication / Login Screen
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#070809] text-zinc-300 font-sans relative overflow-hidden">
        {/* Glowing Background Radial */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-md w-full mx-4 border border-zinc-800/80 bg-[#0c0d0e] rounded-xl p-8 shadow-2xl relative z-10 space-y-6">
          {/* Logo Head */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="bg-gradient-to-tr from-violet-600/20 to-indigo-500/20 p-4 rounded-xl border border-violet-500/30 shadow-lg">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-violet-400">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white font-mono uppercase">Sarkaari-Grade QA</h1>
              <p className="text-xs text-zinc-500 font-mono mt-1">Terminal Access Authentication Required</p>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider font-mono">Access Security Key</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#070809] border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 placeholder-zinc-700 text-center focus:border-violet-600 focus:ring-1 focus:ring-violet-600 focus:outline-none transition duration-150"
                placeholder="Enter password (default: admin)"
                autoFocus
              />
            </div>

            {authError && (
              <p className="text-rose-400 text-[11px] font-mono text-center">{authError}</p>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-lg text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-600/20 hover:shadow-violet-600/40 border border-violet-500/20 transition-all duration-200"
            >
              Unlock Terminal
            </button>
          </form>

          <div className="text-center pt-2">
            <span className="text-[10px] text-zinc-600 font-mono">Protected by Sarkaari-Grade Security Layer</span>
          </div>
        </div>
      </div>
    );
  }

  // RENDER: Main Dashboard
  const isDark = theme === "dark";

  return (
    <div className={`flex flex-col min-h-screen font-sans transition-colors duration-200 ${
      isDark ? "bg-[#070809] text-zinc-300" : "bg-[#f4f6f8] text-slate-700"
    }`}>
      
      {/* Sleek Top Header */}
      <header className={`border-b sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between transition-colors duration-200 ${
        isDark ? "border-zinc-800 bg-[#0c0d0e]/80 backdrop-blur-md" : "border-slate-200 bg-white/80 backdrop-blur-md"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg border transition-colors duration-200 ${
            isDark 
              ? "bg-violet-600/20 border-violet-500/30 shadow-lg shadow-violet-500/5 text-violet-400" 
              : "bg-violet-50 border-violet-200 text-violet-600"
          }`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-md font-bold tracking-tight font-mono ${isDark ? "text-white" : "text-slate-900"}`}>SARKAARI-GRADE</span>
              <span className={`text-[10px] border px-1.5 py-0.5 rounded font-mono ${
                isDark ? "bg-zinc-800 text-zinc-400 border-zinc-700" : "bg-slate-100 text-slate-500 border-slate-200"
              }`}>v1.2.0</span>
            </div>
            <p className={`text-[11px] font-mono ${isDark ? "text-zinc-500" : "text-slate-400"}`}>Autonomous QA Reproduction & Self-Healing Agent</p>
          </div>
        </div>

        {/* Toolbar (Connected, Theme, Logout) */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full relative ${connected ? "bg-emerald-400" : "bg-rose-500"}`}>
              {connected && (
                <span className="absolute -inset-0.5 bg-emerald-400 rounded-full animate-ping opacity-75" />
              )}
            </span>
            <span className={`text-xs font-medium font-mono ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
              {connected ? "Connected" : "Offline"}
            </span>
          </div>

          <div className="h-4 w-[1px] bg-zinc-800" />

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg border transition-all ${
              isDark 
                ? "bg-zinc-900 border-zinc-850 hover:border-zinc-700 text-amber-400" 
                : "bg-white border-slate-200 hover:border-slate-300 text-indigo-600 shadow-sm"
            }`}
            title="Toggle Light/Dark Theme"
          >
            {isDark ? (
              // Sun Icon
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21M9.75 15l1.5 1.5m4.72-4.72l1.5 1.5M4.5 12H3m21 0h-1.5m-3.75-9.75l-1.5 1.5M5.62 18.36l-1.5 1.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              // Moon Icon
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )}
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-medium transition ${
              isDark 
                ? "bg-zinc-900 border-zinc-800 hover:border-rose-900 hover:text-rose-400 text-zinc-400" 
                : "bg-white border-slate-200 hover:border-rose-300 hover:text-rose-600 text-slate-500 shadow-sm"
            }`}
          >
            Lock
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Control Center (Sidebar Panel) */}
        <section className="lg:col-span-4 space-y-5">
          <div className={`border rounded-xl p-5 transition-all duration-200 ${
            isDark ? "border-zinc-800/80 bg-[#0c0d0e] shadow-xl" : "border-slate-200 bg-white shadow-sm"
          }`}>
            <div className="flex items-center justify-between pb-3">
              <h2 className={`text-sm font-semibold uppercase tracking-wider font-mono ${isDark ? "text-zinc-100" : "text-slate-800"}`}>Control Center</h2>
              <span className={`h-1.5 w-12 rounded ${isDark ? "bg-zinc-800" : "bg-slate-100"}`} />
            </div>

            {/* Presets */}
            <div className="space-y-2 pt-2">
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
                          ? isDark 
                            ? "bg-violet-950/20 border-violet-800 text-violet-300 shadow-[inset_0_1px_0_rgba(124,58,237,0.1)]"
                            : "bg-violet-50 border-violet-300 text-violet-700 shadow-sm"
                          : isDark
                            ? "bg-zinc-900/30 border-zinc-800 text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-300"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form Inputs */}
            <div className="space-y-4 pt-3">
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider font-mono">Natural Language Bug Report</label>
                <textarea
                  value={bugReport}
                  onChange={(e) => setBugReport(e.target.value)}
                  rows={4}
                  className={`w-full border rounded-lg p-3 text-xs focus:ring-1 focus:outline-none transition duration-150 ${
                    isDark 
                      ? "bg-[#070809] border-zinc-800 text-zinc-200 placeholder-zinc-700 focus:border-violet-600 focus:ring-violet-600" 
                      : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-violet-500 focus:ring-violet-500"
                  }`}
                  placeholder="Describe the bug in plain English..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider font-mono">Target Application URL</label>
                <input
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  className={`w-full border rounded-lg p-3 text-xs focus:ring-1 focus:outline-none transition duration-150 ${
                    isDark 
                      ? "bg-[#070809] border-zinc-800 text-zinc-200 placeholder-zinc-700 focus:border-violet-600 focus:ring-violet-600" 
                      : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-violet-500 focus:ring-violet-500"
                  }`}
                  placeholder="Target URL (e.g., http://localhost:3001)"
                />
              </div>
            </div>

            {error && (
              <div className={`p-3 border rounded-lg mt-3 ${isDark ? "bg-rose-950/20 border-rose-900/50" : "bg-rose-50 border-rose-200"}`}>
                <p className={`text-xs font-mono ${isDark ? "text-rose-400" : "text-rose-600"}`}>{error}</p>
              </div>
            )}

            {/* Run Button */}
            <button
              onClick={handleStart}
              disabled={running || !connected}
              className={`w-full py-3.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 mt-4 ${
                running
                  ? "bg-zinc-850 border border-zinc-800 text-zinc-500 cursor-not-allowed"
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
          <div className={`border rounded-xl p-5 shadow-sm space-y-3 transition-colors duration-200 ${
            isDark ? "border-zinc-800/80 bg-[#0c0d0e]" : "border-slate-200 bg-white"
          }`}>
            <h3 className={`text-xs font-semibold font-mono uppercase tracking-wider ${isDark ? "text-zinc-300" : "text-slate-700"}`}>Agent Blueprint</h3>
            <ul className={`text-[11px] font-mono space-y-2 ${isDark ? "text-zinc-500" : "text-slate-400"}`}>
              <li className={`flex justify-between py-1 border-b ${isDark ? "border-zinc-900" : "border-slate-100"}`}>
                <span>Model Backend</span>
                <span className={isDark ? "text-zinc-300" : "text-slate-700"}>Claude 3.5 Sonnet</span>
              </li>
              <li className={`flex justify-between py-1 border-b ${isDark ? "border-zinc-900" : "border-slate-100"}`}>
                <span>Reasoning Base</span>
                <span className={isDark ? "text-zinc-300" : "text-slate-700"}>Accessibility Tree</span>
              </li>
              <li className={`flex justify-between py-1 border-b ${isDark ? "border-zinc-900" : "border-slate-100"}`}>
                <span>Step Budget</span>
                <span className={isDark ? "text-zinc-300" : "text-slate-700"}>Max 12 Steps</span>
              </li>
              <li className={`flex justify-between py-1 border-b ${isDark ? "border-zinc-900" : "border-slate-100"}`}>
                <span>Stage Timeout</span>
                <span className={isDark ? "text-zinc-300" : "text-slate-700"}>45 seconds</span>
              </li>
              <li className="flex justify-between py-1">
                <span>Run Assurance</span>
                <span className={isDark ? "text-zinc-300" : "text-slate-700"}>3x Determinism Check</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Right Side: State Visualizer & Console (Workspace Panel) */}
        <section className="lg:col-span-8 flex flex-col space-y-5">
          
          {/* State Machine Status Flow */}
          <StateMachineView currentState={currentState} events={events} theme={theme} />

          {/* Workspace Tabs Section */}
          <div className={`flex-1 flex flex-col border rounded-xl overflow-hidden min-h-[480px] transition-colors duration-200 ${
            isDark ? "border-zinc-800/80 bg-[#0c0d0e] shadow-xl" : "border-slate-200 bg-white shadow-sm"
          }`}>
            {/* Tab Headers */}
            <div className={`flex items-center justify-between border-b px-4 transition-colors duration-200 ${
              isDark ? "border-zinc-800 bg-[#090a0b]" : "border-slate-200 bg-slate-50"
            }`}>
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTab("logs")}
                  className={`px-4 py-3 text-xs font-semibold font-mono border-b-2 transition duration-150 ${
                    activeTab === "logs"
                      ? "border-violet-500 text-violet-400 bg-zinc-900/10"
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
                        ? "border-amber-500 text-amber-400 bg-zinc-900/10"
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
                        ? "border-emerald-500 text-emerald-400 bg-zinc-900/10"
                        : "border-transparent text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    HEALED SPEC
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isDark ? "bg-zinc-800" : "bg-slate-200"}`} />
                <span className={`w-2 h-2 rounded-full ${isDark ? "bg-zinc-800" : "bg-slate-200"}`} />
                <span className={`w-2 h-2 rounded-full ${isDark ? "bg-zinc-800" : "bg-slate-200"}`} />
              </div>
            </div>

            {/* Tab Contents */}
            <div className={`flex-1 p-5 overflow-y-auto max-h-[500px] transition-colors duration-200 ${
              isDark ? "bg-[#070809]/50" : "bg-slate-50/50"
            }`}>
              
              {/* Tab 1: Terminal Logs */}
              {activeTab === "logs" && (
                <div className="font-mono text-xs space-y-2.5">
                  {events.length === 0 ? (
                    <div className={`h-full flex flex-col items-center justify-center py-20 ${
                      isDark ? "text-zinc-650" : "text-slate-400"
                    }`}>
                      <p className="text-sm font-semibold tracking-wider">CONSOLE READY</p>
                      <p className="text-[10px] mt-1">Awaiting agent pipeline initiation...</p>
                    </div>
                  ) : (
                    events.map((e, idx) => {
                      const isError = e.message.startsWith("Error");
                      const isSuccess = e.message.includes("succeeded") || e.message.includes("passed");
                      return (
                        <div
                          key={idx}
                          className={`flex items-start gap-4 border-b pb-2 last:border-0 ${
                            isDark ? "border-zinc-900/50" : "border-slate-100"
                          }`}
                        >
                          <span className={isDark ? "text-zinc-600 select-none" : "text-slate-400 select-none"}>
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
                              isError 
                                ? isDark ? "text-rose-300" : "text-rose-600 font-medium"
                                : isSuccess 
                                ? isDark ? "text-zinc-200 font-medium" : "text-slate-900 font-medium"
                                : isDark ? "text-zinc-400" : "text-slate-600"
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
                  <div className={`p-4 rounded-lg border ${
                    isDark ? "bg-amber-950/10 border-amber-900/30" : "bg-amber-50/50 border-amber-200"
                  }`}>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-500 font-mono mb-2">
                      Semantic Rationale
                    </h4>
                    <p className={`text-xs leading-relaxed font-sans ${isDark ? "text-zinc-300" : "text-slate-700"}`}>
                      {healData.explanation}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
                      Selector Replacement Diff
                    </h4>
                    <pre className={`p-4 rounded-lg border text-[11px] font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed ${
                      isDark ? "bg-[#040405] border-zinc-800 text-zinc-200" : "bg-white border-slate-200 text-slate-800"
                    }`}>
                      {healData.diff.split("\n").map((line, i) => {
                        const isDeletion = line.startsWith("-");
                        const isOriginalHeader = line.startsWith("---");
                        const isNewHeader = line.startsWith("+++");
                        const isAddition = line.startsWith("+") && !isNewHeader;
                        const isFinalDeletion = isDeletion && !isOriginalHeader;
                        return (
                          <div
                            key={i}
                            className={`${
                              isFinalDeletion
                                ? isDark ? "text-rose-400 bg-rose-950/15 -mx-4 px-4" : "text-rose-600 bg-rose-50 -mx-4 px-4"
                                : isAddition
                                ? isDark ? "text-emerald-400 bg-emerald-950/15 -mx-4 px-4" : "text-emerald-600 bg-emerald-50 -mx-4 px-4"
                                : isDark ? "text-zinc-500" : "text-slate-400"
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
                    <span className="text-[11px] font-semibold text-emerald-500 font-mono">HEALED_PLAYWRIGHT_SPEC.spec.ts</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(healData.newSpecContent || "");
                      }}
                      className={`px-2.5 py-1 text-[10px] font-mono border rounded transition ${
                        isDark 
                          ? "bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300" 
                          : "bg-white border-slate-200 hover:border-slate-300 text-slate-700 shadow-sm"
                      }`}
                    >
                      Copy Code
                    </button>
                  </div>
                  <pre className={`p-4 rounded-lg border text-[11px] font-mono overflow-x-auto leading-relaxed ${
                    isDark ? "bg-[#040405] border-zinc-800 text-zinc-300" : "bg-white border-slate-200 text-slate-800"
                  }`}>
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

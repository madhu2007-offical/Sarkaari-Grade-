import { PIPELINE_ORDER } from "./types";

interface Props {
  currentState: string;
  events: any[];
  theme: "light" | "dark";
}

export function StateMachineView({ currentState, theme }: Props) {
  const activeIdx = PIPELINE_ORDER.indexOf(currentState as typeof PIPELINE_ORDER[number]);
  const isDark = theme === "dark";

  const stateLabels: Record<string, string> = {
    IDLE: "IDLE",
    EXPLORING: "EXPLORING",
    REPRODUCING: "REPRODUCING",
    CODIFYING: "CODIFYING",
    VERIFYING: "VERIFYING",
    PASS: "PASS",
    HEALING: "HEALING",
    FALLBACK_RECORDING: "FALLBACK_REC",
    DONE: "COMPLETE",
  };

  const getStateStyle = (state: string, idx: number) => {
    const isActive = state === currentState;
    const isPast = idx < activeIdx;

    if (isActive) {
      if (isDark) {
        switch (state) {
          case "EXPLORING":
            return "bg-cyan-950/30 border-cyan-500/80 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.25)] animate-pulse";
          case "REPRODUCING":
            return "bg-indigo-950/30 border-indigo-500/80 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.25)] animate-pulse";
          case "CODIFYING":
            return "bg-purple-950/30 border-purple-500/80 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.25)] animate-pulse";
          case "VERIFYING":
            return "bg-amber-950/30 border-amber-500/80 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)] animate-pulse";
          case "PASS":
            return "bg-emerald-950/30 border-emerald-500/80 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]";
          case "HEALING":
            return "bg-orange-950/30 border-orange-500/80 text-orange-300 shadow-[0_0_15px_rgba(249,115,22,0.25)] animate-pulse";
          case "FALLBACK_RECORDING":
            return "bg-rose-950/30 border-rose-500/80 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.25)] animate-pulse";
          case "DONE":
            return "bg-teal-950/30 border-teal-500/80 text-teal-300 shadow-[0_0_15px_rgba(20,184,166,0.25)]";
          default:
            return "bg-zinc-800 border-zinc-700 text-zinc-300 animate-pulse";
        }
      } else {
        // Light mode active nodes
        switch (state) {
          case "EXPLORING":
            return "bg-cyan-50 border-cyan-400 text-cyan-700 shadow-sm animate-pulse";
          case "REPRODUCING":
            return "bg-indigo-50 border-indigo-400 text-indigo-700 shadow-sm animate-pulse";
          case "CODIFYING":
            return "bg-purple-50 border-purple-400 text-purple-700 shadow-sm animate-pulse";
          case "VERIFYING":
            return "bg-amber-50 border-amber-400 text-amber-700 shadow-sm animate-pulse";
          case "PASS":
            return "bg-emerald-50 border-emerald-400 text-emerald-700 shadow-sm";
          case "HEALING":
            return "bg-orange-50 border-orange-400 text-orange-700 shadow-sm animate-pulse";
          case "FALLBACK_RECORDING":
            return "bg-rose-50 border-rose-400 text-rose-700 shadow-sm animate-pulse";
          case "DONE":
            return "bg-teal-50 border-teal-400 text-teal-700 shadow-sm";
          default:
            return "bg-slate-100 border-slate-400 text-slate-700 animate-pulse";
        }
      }
    }

    if (isPast) {
      if (state === "FALLBACK_RECORDING") {
        return isDark 
          ? "bg-rose-950/5 border-rose-950 text-rose-900/60"
          : "bg-rose-50/50 border-rose-100 text-rose-400";
      }
      return isDark
        ? "bg-zinc-950/50 border-zinc-850 text-zinc-650"
        : "bg-slate-50 border-slate-200/60 text-slate-400";
    }

    return isDark
      ? "bg-[#070809] border-zinc-900 text-zinc-800"
      : "bg-slate-100/50 border-slate-200/20 text-slate-300";
  };

  return (
    <div className={`border rounded-xl p-5 transition-all duration-200 ${
      isDark ? "border-zinc-800/80 bg-[#0c0d0e] shadow-xl" : "border-slate-200 bg-white shadow-sm"
    }`}>
      <div className="flex items-center justify-between">
        <h2 className={`text-xs font-semibold uppercase tracking-wider font-mono ${
          isDark ? "text-zinc-100" : "text-slate-800"
        }`}>Pipeline Monitor</h2>
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-mono uppercase ${isDark ? "text-zinc-500" : "text-slate-400"}`}>Current Stage:</span>
          <span className={`text-[10px] font-mono font-bold border px-2 py-0.5 rounded uppercase ${
            isDark 
              ? "text-violet-400 bg-violet-950/20 border-violet-900/50" 
              : "text-violet-700 bg-violet-50 border-violet-200"
          }`}>
            {currentState}
          </span>
        </div>
      </div>

      {/* Horizontal Connector Timeline */}
      <div className="relative py-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-[760px] pb-1">
          {PIPELINE_ORDER.map((state, idx) => {
            const label = stateLabels[state] || state;
            const styleClass = getStateStyle(state, idx);

            return (
              <div key={state} className="flex-1 flex items-center gap-1.5 last:flex-initial">
                {/* Node Capsule */}
                <div
                  className={`flex-1 text-center py-2.5 border rounded-lg text-[9px] font-bold font-mono transition-all duration-300 ${styleClass}`}
                >
                  {label}
                </div>
                {/* Connector Line (except for last node) */}
                {idx < PIPELINE_ORDER.length - 1 && (
                  <div
                    className={`h-[1px] w-3 transition-all duration-300 ${
                      idx < activeIdx 
                        ? isDark ? "bg-zinc-800" : "bg-slate-350"
                        : isDark ? "bg-zinc-900" : "bg-slate-200/50"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

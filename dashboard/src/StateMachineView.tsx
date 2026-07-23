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
      // Purple → Active Stage
      return isDark
        ? "bg-purple-950/30 border-purple-500/80 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.25)] animate-pulse"
        : "bg-purple-50 border-purple-400 text-purple-700 shadow-sm animate-pulse";
    }

    if (isPast) {
      if (state === "FALLBACK_RECORDING") {
        // Red → Failure / Fallback
        return isDark 
          ? "bg-red-950/20 border-red-500/50 text-red-400"
          : "bg-red-50 border-red-300 text-red-700 shadow-sm";
      }
      // Green → Success
      return isDark
        ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-400/90"
        : "bg-emerald-50 border-emerald-350 text-emerald-700 shadow-sm";
    }

    // Blue/Gray → Info / Pending
    return isDark
      ? "bg-[#070809] border-zinc-900 text-zinc-700"
      : "bg-slate-100/50 border-slate-200/20 text-slate-400";
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

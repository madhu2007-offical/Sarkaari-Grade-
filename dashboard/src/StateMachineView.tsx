import { PIPELINE_ORDER } from "./types";

interface Props {
  currentState: string;
  events: any[];
}

export function StateMachineView({ currentState }: Props) {
  const activeIdx = PIPELINE_ORDER.indexOf(currentState as typeof PIPELINE_ORDER[number]);

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
    }

    if (isPast) {
      if (state === "FALLBACK_RECORDING") {
        return "bg-rose-950/5 border-rose-950 text-rose-900/60";
      }
      return "bg-zinc-950/50 border-zinc-850 text-zinc-600";
    }

    return "bg-[#070809] border-zinc-900 text-zinc-800";
  };

  return (
    <div className="border border-zinc-800/80 bg-[#0c0d0e] rounded-xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider font-mono">Pipeline Monitor</h2>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-zinc-500 uppercase">Current Stage:</span>
          <span className="text-[10px] font-mono font-bold text-violet-400 bg-violet-950/20 border border-violet-900/50 px-2 py-0.5 rounded uppercase">
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
                      idx < activeIdx ? "bg-zinc-800" : "bg-zinc-900"
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

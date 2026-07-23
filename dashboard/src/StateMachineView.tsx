import { PipelineEvent, STATE_COLORS, PIPELINE_ORDER } from "./types";

interface Props {
  currentState: string;
  events: PipelineEvent[];
}

export function StateMachineView({ currentState, events }: Props) {
  const activeIdx = PIPELINE_ORDER.indexOf(currentState as typeof PIPELINE_ORDER[number]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-lg font-semibold text-sarkaari-900 mb-4">State Machine</h2>
      <div className="flex flex-wrap gap-2 mb-6">
        {PIPELINE_ORDER.filter((s) => s !== "PASS").map((state, idx) => {
          const isActive = state === currentState;
          const isPast = idx < activeIdx;
          return (
            <div
              key={state}
              className={`px-3 py-1.5 rounded-full text-xs font-medium text-white transition-all ${
                isActive
                  ? `${STATE_COLORS[state]} ring-2 ring-offset-2 ring-sarkaari-500 scale-105`
                  : isPast
                  ? `${STATE_COLORS[state]} opacity-60`
                  : "bg-slate-200 text-slate-500"
              }`}
            >
              {state}
            </div>
          );
        })}
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {events.length === 0 ? (
          <p className="text-slate-400 text-sm">No events yet. Start a pipeline run.</p>
        ) : (
          events.map((e, i) => (
            <div
              key={i}
              className="flex gap-3 text-sm border-l-2 border-sarkaari-500 pl-3 py-1"
            >
              <span className="text-slate-400 whitespace-nowrap font-mono text-xs">
                {new Date(e.timestamp).toLocaleTimeString()}
              </span>
              <span className={`font-medium ${STATE_COLORS[e.state]} bg-clip-text`}>
                [{e.state}]
              </span>
              <span className="text-slate-700">{e.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

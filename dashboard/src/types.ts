export type OrchestratorState =
  | "IDLE"
  | "EXPLORING"
  | "REPRODUCING"
  | "CODIFYING"
  | "VERIFYING"
  | "PASS"
  | "HEALING"
  | "FALLBACK_RECORDING"
  | "DONE";

export interface PipelineEvent {
  state: OrchestratorState;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export const STATE_COLORS: Record<OrchestratorState, string> = {
  IDLE: "bg-slate-400",
  EXPLORING: "bg-blue-400",
  REPRODUCING: "bg-indigo-500",
  CODIFYING: "bg-purple-500",
  VERIFYING: "bg-amber-500",
  PASS: "bg-green-500",
  HEALING: "bg-orange-500",
  FALLBACK_RECORDING: "bg-red-400",
  DONE: "bg-emerald-600",
};

export const PIPELINE_ORDER: OrchestratorState[] = [
  "IDLE",
  "EXPLORING",
  "REPRODUCING",
  "CODIFYING",
  "VERIFYING",
  "PASS",
  "HEALING",
  "FALLBACK_RECORDING",
  "DONE",
];

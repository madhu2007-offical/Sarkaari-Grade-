export type AgentAction =
  | { type: "navigate"; url: string }
  | { type: "click"; role: string; name: string }
  | { type: "fill"; role: string; name: string; value: string }
  | { type: "press"; key: string }
  | { type: "wait"; ms: number }
  | { type: "assert_text"; text: string; present: boolean }
  | { type: "done"; summary: string; reproduced: boolean };

export interface AgentStep {
  step: number;
  action: AgentAction;
  reasoning: string;
  snapshotHash?: string;
}

export interface ReproductionTrace {
  id: string;
  bugReport: string;
  targetUrl: string;
  startedAt: string;
  completedAt?: string;
  reproduced: boolean;
  steps: AgentStep[];
  finalSummary: string;
  error?: string;
}

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

export interface OrchestratorEvent {
  state: OrchestratorState;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export interface CodegenResult {
  specPath: string;
  specContent: string;
  valid: boolean;
  errors?: string[];
}

export interface VerifyResult {
  passed: boolean;
  runs: number;
  successes: number;
  failures: string[];
}

export interface HealResult {
  patched: boolean;
  diff: string;
  explanation: string;
  newSpecContent?: string;
}

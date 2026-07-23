import { OrchestratorState, OrchestratorEvent } from "../../shared/types.js";

export const STAGE_TIMEOUT_MS = 45_000;
export const MAX_RETRIES = 2;

export type StateHandler = () => Promise<{ success: boolean; data?: unknown }>;

export interface PipelineContext {
  bugReport: string;
  targetUrl: string;
  traceId?: string;
  specPath?: string;
  verifyFailures?: string[];
  retries: Record<string, number>;
  result?: Record<string, unknown>;
  usedFallback?: boolean;
}

export class StateMachine {
  state: OrchestratorState = "IDLE";
  private listeners: ((event: OrchestratorEvent) => void)[] = [];
  ctx: PipelineContext;

  constructor(bugReport: string, targetUrl: string) {
    this.ctx = { bugReport, targetUrl, retries: {} };
  }

  onEvent(cb: (event: OrchestratorEvent) => void) {
    this.listeners.push(cb);
  }

  emit(message: string, data?: Record<string, unknown> | unknown) {
    const event: OrchestratorEvent = {
      state: this.state,
      message,
      timestamp: new Date().toISOString(),
      data: data as Record<string, unknown> | undefined,
    };
    this.listeners.forEach((cb) => cb(event));
  }

  setState(state: OrchestratorState) {
    this.state = state;
  }

  async runStage(stage: OrchestratorState, handler: StateHandler): Promise<boolean> {
    this.state = stage;
    const retryKey = stage;
    this.ctx.retries[retryKey] = this.ctx.retries[retryKey] || 0;
    this.emit(`Entering ${stage}`);

    while (this.ctx.retries[retryKey] <= MAX_RETRIES) {
      try {
        const result = await Promise.race([
          handler(),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error(`${stage} timeout after ${STAGE_TIMEOUT_MS}ms`)),
              STAGE_TIMEOUT_MS
            )
          ),
        ]);

        if (result.success) {
          this.emit(`${stage} succeeded`, result.data);
          return true;
        }
        this.emit(`${stage} failed (attempt ${this.ctx.retries[retryKey] + 1})`, result.data);
      } catch (err) {
        this.emit(`${stage} error (attempt ${this.ctx.retries[retryKey] + 1})`, {
          error: err instanceof Error ? err.message : String(err),
        });
      }

      this.ctx.retries[retryKey]++;
      if (this.ctx.retries[retryKey] > MAX_RETRIES) break;
      this.emit(`Retrying ${stage} (${this.ctx.retries[retryKey]}/${MAX_RETRIES})`);
    }

    return false;
  }

  async fallback(onFallback: () => void): Promise<void> {
    this.state = "FALLBACK_RECORDING";
    this.emit("Entering fallback — using pre-recorded verified run");
    this.ctx.usedFallback = true;
    onFallback();
    this.state = "DONE";
    this.emit("Pipeline complete (fallback)", this.ctx.result);
  }

  complete(): void {
    this.state = "DONE";
    this.emit("Pipeline complete", this.ctx.result);
  }
}

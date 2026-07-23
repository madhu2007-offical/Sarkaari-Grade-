import { useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { PipelineEvent } from "./types";

const ORCHESTRATOR_URL =
  import.meta.env.VITE_ORCHESTRATOR_URL || "http://localhost:3000";

export function usePipeline() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [currentState, setCurrentState] = useState<string>("IDLE");

  useEffect(() => {
    const s = io(ORCHESTRATOR_URL, { transports: ["websocket", "polling"] });

    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));

    s.on("pipeline:start", () => {
      setRunning(true);
      setEvents([]);
      setCurrentState("IDLE");
    });

    s.on("pipeline:event", (event: PipelineEvent) => {
      setEvents((prev) => [...prev, event]);
      setCurrentState(event.state);
    });

    s.on("pipeline:end", () => setRunning(false));
    s.on("pipeline:error", (data: { error: string }) => {
      setEvents((prev) => [
        ...prev,
        {
          state: "DONE" as const,
          message: `Error: ${data.error}`,
          timestamp: new Date().toISOString(),
        },
      ]);
      setRunning(false);
    });

    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, []);

  const startPipeline = useCallback(
    async (bugReport: string, targetUrl: string) => {
      const res = await fetch(`${ORCHESTRATOR_URL}/api/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bugReport, targetUrl }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to start pipeline");
      }
    },
    []
  );

  return { socket, connected, running, events, currentState, startPipeline };
}

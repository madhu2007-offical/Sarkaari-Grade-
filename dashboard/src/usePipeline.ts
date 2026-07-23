import { useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { PipelineEvent } from "./types";

export function usePipeline() {
  const [orchestratorUrl, setOrchestratorUrl] = useState(() => {
    return (
      localStorage.getItem("sarkaari_orchestrator_url") ||
      import.meta.env.VITE_ORCHESTRATOR_URL ||
      "http://localhost:3000"
    );
  });
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [currentState, setCurrentState] = useState<string>("IDLE");

  useEffect(() => {
    const s = io(orchestratorUrl, { transports: ["websocket", "polling"] });

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
  }, [orchestratorUrl]);

  const updateOrchestratorUrl = useCallback((newUrl: string) => {
    localStorage.setItem("sarkaari_orchestrator_url", newUrl);
    setOrchestratorUrl(newUrl);
  }, []);

  const startPipeline = useCallback(
    async (bugReport: string, targetUrl: string) => {
      const res = await fetch(`${orchestratorUrl}/api/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bugReport, targetUrl }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to start pipeline");
      }
    },
    [orchestratorUrl]
  );

  return {
    socket,
    connected,
    running,
    events,
    currentState,
    orchestratorUrl,
    updateOrchestratorUrl,
    startPipeline,
  };
}

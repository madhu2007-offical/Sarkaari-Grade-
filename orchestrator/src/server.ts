import "../../shared/env.js";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { runPipeline } from "./pipeline.js";

const PORT = Number(process.env.ORCHESTRATOR_PORT) || 3000;
const DEMO_URL = process.env.DEMO_APP_URL || "http://localhost:3001";

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

let running = false;

app.get("/health", (_req, res) => {
  res.json({ status: "ok", running });
});

app.post("/api/run", async (req, res) => {
  if (running) {
    return res.status(409).json({ error: "Pipeline already running" });
  }

  const bugReport =
    req.body.bugReport ||
    "When I click Checkout with an empty cart, the app shows an error";
  const targetUrl = req.body.targetUrl || DEMO_URL;

  running = true;
  res.json({ started: true, bugReport, targetUrl });

  io.emit("pipeline:start", { bugReport, targetUrl });

  try {
    await runPipeline(bugReport, targetUrl, (event) => {
      io.emit("pipeline:event", event);
    });
  } catch (err) {
    io.emit("pipeline:error", {
      error: err instanceof Error ? err.message : String(err),
    });
  } finally {
    running = false;
    io.emit("pipeline:end", {});
  }
});

io.on("connection", (socket) => {
  console.log("Dashboard connected:", socket.id);
  socket.emit("pipeline:connected", { message: "Connected to orchestrator" });
});

httpServer.listen(PORT, () => {
  console.log(`Orchestrator running at http://localhost:${PORT}`);
});

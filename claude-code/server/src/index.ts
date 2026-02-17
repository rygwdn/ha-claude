import express from "express";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { resolve } from "path";
import { TerminalManager } from "./terminal-manager.js";
import { SessionStore } from "./session-store.js";
import { setupHAProxy } from "./ha-proxy.js";
import { ingressMiddleware } from "./routes/ingress.js";
import { createApiRouter } from "./routes/api.js";

const PORT = parseInt(process.env.INGRESS_PORT || "8099", 10);

const app = express();
const server = http.createServer(app);

// WebSocket server — mount on /api/ws path
const wss = new WebSocketServer({ noServer: true });

const terminalManager = new TerminalManager();
const sessionStore = new SessionStore();

// Middleware
app.use(ingressMiddleware);
app.use(express.json());

// API routes
const apiRouter = createApiRouter(terminalManager, sessionStore);
app.use(apiRouter);

// HA API proxy
setupHAProxy(app);

// Serve frontend static files
app.use(express.static(resolve("/opt/server/public")));

// SPA fallback: serve index.html for any non-API route
app.get("*", (req, res) => {
  if (!req.path.startsWith("/api/")) {
    res.sendFile(resolve("/opt/server/public/index.html"));
  } else {
    res.status(404).json({ error: "Not found" });
  }
});

// WebSocket upgrade handling
server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);

  if (url.pathname === "/api/ws") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

// WebSocket connection handling
wss.on("connection", (ws: WebSocket, request) => {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);
  let sessionId = url.searchParams.get("session");

  if (!sessionId) {
    ws.send(JSON.stringify({ type: "error", message: "session parameter required" }));
    ws.close();
    return;
  }

  // Create or get existing session
  let session = terminalManager.getSession(sessionId);
  if (!session) {
    const stored = sessionStore.get(sessionId);
    session = terminalManager.createSession(
      sessionId,
      stored?.name || `Session`
    );
    sessionStore.add(sessionId, session.name);
  }

  // Attach client and replay buffer
  const buffer = terminalManager.attachClient(sessionId, ws);

  // Send session info
  ws.send(
    JSON.stringify({
      type: "session",
      id: session.id,
      name: session.name,
      alive: session.alive,
    })
  );

  // Replay buffered output
  for (const chunk of buffer) {
    ws.send(JSON.stringify({ type: "output", data: chunk }));
  }

  // Handle incoming messages
  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());

      switch (msg.type) {
        case "input":
          terminalManager.writeToSession(sessionId!, msg.data);
          break;

        case "resize":
          if (msg.cols && msg.rows) {
            terminalManager.resizeSession(sessionId!, msg.cols, msg.rows);
          }
          break;

        default:
          break;
      }
    } catch {
      // Raw string input (fallback)
      terminalManager.writeToSession(sessionId!, data.toString());
    }
  });

  // Handle disconnect
  ws.on("close", () => {
    terminalManager.detachClient(sessionId!, ws);
    sessionStore.updateActivity(sessionId!);
  });
});

// Start server
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Claude Code server listening on port ${PORT}`);
});

import express from "express";
import http from "http";
import net from "net";
import { createProxyMiddleware } from "http-proxy-middleware";
import { setupHAProxy } from "./ha-proxy.js";
import { ingressMiddleware } from "./routes/ingress.js";

const PORT = parseInt(process.env.INGRESS_PORT || "8099", 10);
const CLAUDEUI_PORT = parseInt(process.env.CLAUDEUI_PORT || "3001", 10);
const CLAUDEUI_TARGET = `http://127.0.0.1:${CLAUDEUI_PORT}`;

const app = express();
const server = http.createServer(app);

// Parse ingress path from HA
app.use(ingressMiddleware);

// JSON body parsing for our HA API endpoints
app.use("/api/ha", express.json());

// HA-specific API endpoints (entity states, services, config, logs)
setupHAProxy(app);

// Proxy everything else to claudecodeui
const uiProxy = createProxyMiddleware({
  target: CLAUDEUI_TARGET,
  ws: true,
  changeOrigin: true,
  // Pass through ingress headers
  on: {
    proxyReq: (proxyReq, req) => {
      // Forward the original host for claudecodeui
      const ingressPath = (req as unknown as Record<string, string>).ingressPath;
      if (ingressPath) {
        proxyReq.setHeader("X-Ingress-Path", ingressPath);
      }
    },
  },
});

app.use(uiProxy);

// WebSocket upgrade — proxy to claudecodeui
server.on("upgrade", (req, socket, head) => {
  uiProxy.upgrade!(req, socket as unknown as net.Socket, head);
});

// Start server
server.listen(PORT, "0.0.0.0", () => {
  console.log(`HA Claude proxy listening on port ${PORT}`);
  console.log(`Proxying to claudecodeui at ${CLAUDEUI_TARGET}`);
});

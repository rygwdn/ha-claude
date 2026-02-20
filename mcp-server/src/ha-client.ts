/**
 * Home Assistant API client for the MCP server.
 *
 * Supports two modes:
 *  - Add-on / Terminal:   SUPERVISOR_TOKEN set → uses http://supervisor/core/api
 *  - External (plugin):   HA_URL + HA_TOKEN set → connects to any HA instance
 */

import WebSocket from "ws";

function getConfig() {
  const supervisorToken = process.env.SUPERVISOR_TOKEN;
  const haUrl = process.env.HA_URL;
  const haToken = process.env.HA_TOKEN;

  if (supervisorToken) {
    return {
      restBase: "http://supervisor/core/api",
      wsUrl: "ws://supervisor/core/websocket",
      token: supervisorToken,
    };
  }

  if (!haUrl || !haToken) {
    throw new Error(
      "Either SUPERVISOR_TOKEN (inside HA add-on) or HA_URL + HA_TOKEN (external) must be set.\n" +
        "Example: HA_URL=http://homeassistant.local:8123 HA_TOKEN=<long-lived-token>"
    );
  }

  const base = haUrl.replace(/\/$/, "");
  const wsBase = base.replace(/^http/, "ws");
  return {
    restBase: `${base}/api`,
    wsUrl: `${wsBase}/api/websocket`,
    token: haToken,
  };
}

export async function restGet(path: string): Promise<unknown> {
  const { restBase, token } = getConfig();
  const res = await fetch(`${restBase}${path}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`HA API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function restGetText(path: string): Promise<string> {
  const { restBase, token } = getConfig();
  const res = await fetch(`${restBase}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HA API ${res.status}: ${await res.text()}`);
  return res.text();
}

export async function restPost(path: string, body?: unknown): Promise<unknown> {
  const { restBase, token } = getConfig();
  const res = await fetch(`${restBase}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`HA API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function supervisorGet(path: string): Promise<unknown> {
  const supervisorToken = process.env.SUPERVISOR_TOKEN;
  if (!supervisorToken) {
    throw new Error("Supervisor API is only available inside an HA add-on (SUPERVISOR_TOKEN not set)");
  }
  const res = await fetch(`http://supervisor${path}`, {
    headers: { Authorization: `Bearer ${supervisorToken}` },
  });
  if (!res.ok) throw new Error(`Supervisor API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function supervisorPost(path: string, body?: unknown): Promise<unknown> {
  const supervisorToken = process.env.SUPERVISOR_TOKEN;
  if (!supervisorToken) {
    throw new Error("Supervisor API is only available inside an HA add-on (SUPERVISOR_TOKEN not set)");
  }
  const res = await fetch(`http://supervisor${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${supervisorToken}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Supervisor API ${res.status}: ${await res.text()}`);
  return res.json();
}

let msgId = 1;

export async function wsCommand(message: Record<string, unknown>): Promise<unknown> {
  const { wsUrl, token } = getConfig();
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const id = msgId++;

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error("WebSocket command timed out after 30s"));
    }, 30000);

    ws.on("message", (data) => {
      const msg = JSON.parse(data.toString());

      if (msg.type === "auth_required") {
        ws.send(JSON.stringify({ type: "auth", access_token: token }));
        return;
      }
      if (msg.type === "auth_ok") {
        ws.send(JSON.stringify({ ...message, id }));
        return;
      }
      if (msg.type === "auth_invalid") {
        clearTimeout(timeout);
        ws.close();
        reject(new Error(`Auth failed: ${msg.message}`));
        return;
      }
      if (msg.id === id) {
        clearTimeout(timeout);
        ws.close();
        if (msg.success) resolve(msg.result);
        else reject(new Error(`WS command failed: ${msg.error?.message || JSON.stringify(msg.error)}`));
      }
    });

    ws.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

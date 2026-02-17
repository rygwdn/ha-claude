import WebSocket from "ws";

const SUPERVISOR_TOKEN = process.env.SUPERVISOR_TOKEN;
const HA_REST_URL = "http://supervisor/core/api";
const HA_WS_URL = "ws://supervisor/core/websocket";

if (!SUPERVISOR_TOKEN) {
  console.error(
    "Error: SUPERVISOR_TOKEN not set. This tool must run inside a Home Assistant add-on."
  );
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${SUPERVISOR_TOKEN}`,
  "Content-Type": "application/json",
};

export async function restGet(path: string): Promise<unknown> {
  const res = await fetch(`${HA_REST_URL}${path}`, { headers });
  if (!res.ok) {
    throw new Error(`HA API ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export async function restPost(
  path: string,
  body?: unknown
): Promise<unknown> {
  const res = await fetch(`${HA_REST_URL}${path}`, {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`HA API ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

let msgId = 1;

export async function wsCommand(message: Record<string, unknown>): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(HA_WS_URL);
    const id = msgId++;
    let authenticated = false;

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error("WebSocket command timed out after 30s"));
    }, 30000);

    ws.on("message", (data) => {
      const msg = JSON.parse(data.toString());

      if (msg.type === "auth_required") {
        ws.send(
          JSON.stringify({ type: "auth", access_token: SUPERVISOR_TOKEN })
        );
        return;
      }

      if (msg.type === "auth_ok") {
        authenticated = true;
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
        if (msg.success) {
          resolve(msg.result);
        } else {
          reject(
            new Error(`WS command failed: ${msg.error?.message || JSON.stringify(msg.error)}`)
          );
        }
      }
    });

    ws.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

// Supervisor API (different base URL)
export async function supervisorGet(path: string): Promise<unknown> {
  const res = await fetch(`http://supervisor${path}`, {
    headers: { Authorization: `Bearer ${SUPERVISOR_TOKEN}` },
  });
  if (!res.ok) {
    throw new Error(`Supervisor API ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export async function supervisorPost(
  path: string,
  body?: unknown
): Promise<unknown> {
  const res = await fetch(`http://supervisor${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPERVISOR_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`Supervisor API ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

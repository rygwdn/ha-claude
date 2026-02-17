import type { Express, Request, Response } from "express";

const SUPERVISOR_TOKEN = process.env.SUPERVISOR_TOKEN || "";
const HA_API_URL = "http://supervisor/core/api";

async function haFetch(path: string): Promise<unknown> {
  const res = await fetch(`${HA_API_URL}${path}`, {
    headers: { Authorization: `Bearer ${SUPERVISOR_TOKEN}` },
  });
  if (!res.ok) {
    throw new Error(`HA API error: ${res.status}`);
  }
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return res.text();
}

export function setupHAProxy(app: Express): void {
  // Entity states
  app.get("/api/ha/states", async (_req: Request, res: Response) => {
    try {
      const states = await haFetch("/states");
      res.json(states);
    } catch (err) {
      res.status(502).json({ error: (err as Error).message });
    }
  });

  // Single entity state
  app.get(
    "/api/ha/states/:entityId",
    async (req: Request, res: Response) => {
      try {
        const state = await haFetch(`/states/${req.params.entityId}`);
        res.json(state);
      } catch (err) {
        res.status(502).json({ error: (err as Error).message });
      }
    }
  );

  // Services
  app.get("/api/ha/services", async (_req: Request, res: Response) => {
    try {
      const services = await haFetch("/services");
      res.json(services);
    } catch (err) {
      res.status(502).json({ error: (err as Error).message });
    }
  });

  // HA config
  app.get("/api/ha/config", async (_req: Request, res: Response) => {
    try {
      const config = await haFetch("/config");
      res.json(config);
    } catch (err) {
      res.status(502).json({ error: (err as Error).message });
    }
  });

  // Error log
  app.get("/api/ha/logs", async (req: Request, res: Response) => {
    try {
      const text = await haFetch("/error_log");
      const lines = (text as string).split("\n");
      const count = parseInt((req.query.lines as string) || "100", 10);
      res.json({ lines: lines.slice(-count) });
    } catch (err) {
      res.status(502).json({ error: (err as Error).message });
    }
  });
}

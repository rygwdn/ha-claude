import * as pty from "node-pty";
import type { WebSocket } from "ws";
import { readFileSync } from "fs";

interface ServerConfig {
  anthropicApiKey: string;
  model: string;
  permissionMode: string;
  autoBackup: boolean;
}

export interface TerminalSession {
  id: string;
  name: string;
  pty: pty.IPty;
  buffer: string[];
  clients: Set<WebSocket>;
  createdAt: Date;
  lastActivity: Date;
  alive: boolean;
}

const MAX_BUFFER_SIZE = 5000;

function loadServerConfig(): ServerConfig {
  try {
    const raw = readFileSync("/data/server-config.json", "utf-8");
    return JSON.parse(raw);
  } catch {
    return {
      anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
      model: "sonnet",
      permissionMode: "default",
      autoBackup: true,
    };
  }
}

export class TerminalManager {
  private sessions = new Map<string, TerminalSession>();

  createSession(id: string, name?: string): TerminalSession {
    if (this.sessions.has(id)) {
      return this.sessions.get(id)!;
    }

    const config = loadServerConfig();
    const args = this.buildClaudeArgs(config);

    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      ANTHROPIC_API_KEY: config.anthropicApiKey,
      TERM: "xterm-256color",
      HOME: "/root",
    };

    // Keep SUPERVISOR_TOKEN from process env
    if (process.env.SUPERVISOR_TOKEN) {
      env.SUPERVISOR_TOKEN = process.env.SUPERVISOR_TOKEN;
    }

    const shell = pty.spawn("claude", args, {
      name: "xterm-256color",
      cwd: "/homeassistant",
      env,
      cols: 120,
      rows: 40,
    });

    const session: TerminalSession = {
      id,
      name: name || `Session ${this.sessions.size + 1}`,
      pty: shell,
      buffer: [],
      clients: new Set(),
      createdAt: new Date(),
      lastActivity: new Date(),
      alive: true,
    };

    shell.onData((data) => {
      session.lastActivity = new Date();
      session.buffer.push(data);
      if (session.buffer.length > MAX_BUFFER_SIZE) {
        session.buffer.shift();
      }
      for (const client of session.clients) {
        if (client.readyState === 1) {
          // OPEN
          client.send(JSON.stringify({ type: "output", data }));
        }
      }
    });

    shell.onExit(({ exitCode }) => {
      session.alive = false;
      for (const client of session.clients) {
        if (client.readyState === 1) {
          client.send(
            JSON.stringify({
              type: "exit",
              exitCode,
            })
          );
        }
      }
    });

    this.sessions.set(id, session);
    return session;
  }

  private buildClaudeArgs(config: ServerConfig): string[] {
    const args: string[] = [];

    if (config.permissionMode === "bypassPermissions") {
      args.push("--dangerously-skip-permissions");
    } else if (config.permissionMode === "plan") {
      args.push("--permission-mode", "plan");
    }

    if (config.model && config.model !== "sonnet") {
      args.push("--model", config.model);
    }

    return args;
  }

  getSession(id: string): TerminalSession | undefined {
    return this.sessions.get(id);
  }

  listSessions(): Array<{
    id: string;
    name: string;
    createdAt: string;
    lastActivity: string;
    alive: boolean;
    clientCount: number;
  }> {
    return Array.from(this.sessions.values()).map((s) => ({
      id: s.id,
      name: s.name,
      createdAt: s.createdAt.toISOString(),
      lastActivity: s.lastActivity.toISOString(),
      alive: s.alive,
      clientCount: s.clients.size,
    }));
  }

  attachClient(sessionId: string, ws: WebSocket): string[] {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    session.clients.add(ws);
    return session.buffer;
  }

  detachClient(sessionId: string, ws: WebSocket): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.clients.delete(ws);
    }
  }

  writeToSession(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.alive) return;
    session.pty.write(data);
  }

  resizeSession(sessionId: string, cols: number, rows: number): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.alive) return;
    session.pty.resize(cols, rows);
  }

  destroySession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (session.alive) {
      session.pty.kill();
    }

    for (const client of session.clients) {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ type: "destroyed" }));
      }
    }

    this.sessions.delete(sessionId);
  }
}

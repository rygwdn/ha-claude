import { Router } from "express";
import type { Request, Response } from "express";
import { readdirSync, readFileSync, statSync, existsSync } from "fs";
import { join, resolve } from "path";
import { execSync } from "child_process";
import type { TerminalManager } from "../terminal-manager.js";
import type { SessionStore } from "../session-store.js";

const HA_CONFIG_DIR = "/homeassistant";

export function createApiRouter(
  terminalManager: TerminalManager,
  sessionStore: SessionStore
): Router {
  const router = Router();

  // Addon config (ingress path, etc.)
  router.get("/api/config", (req: Request, res: Response) => {
    const ingressPath =
      (req as unknown as Record<string, string>).ingressPath || "";
    res.json({ ingressPath });
  });

  // Session management
  router.get("/api/sessions", (_req: Request, res: Response) => {
    const liveSessions = terminalManager.listSessions();
    const storedSessions = sessionStore.list();

    // Merge live and stored data
    const sessions = storedSessions.map((stored) => {
      const live = liveSessions.find((l) => l.id === stored.id);
      return {
        ...stored,
        alive: live?.alive ?? false,
        clientCount: live?.clientCount ?? 0,
      };
    });

    res.json(sessions);
  });

  router.post("/api/sessions", (req: Request, res: Response) => {
    const { name } = req.body || {};
    const id = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const sessionName = name || `Session ${sessionStore.list().length + 1}`;

    terminalManager.createSession(id, sessionName);
    sessionStore.add(id, sessionName);

    res.json({ id, name: sessionName });
  });

  router.delete("/api/sessions/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    terminalManager.destroySession(id);
    sessionStore.remove(id);
    res.json({ ok: true });
  });

  // File browser
  router.get("/api/files", (req: Request, res: Response) => {
    const relPath = (req.query.path as string) || "";
    const absPath = resolve(HA_CONFIG_DIR, relPath);

    // Prevent directory traversal
    if (!absPath.startsWith(HA_CONFIG_DIR)) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    if (!existsSync(absPath)) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    try {
      const stat = statSync(absPath);
      if (!stat.isDirectory()) {
        res.status(400).json({ error: "Not a directory" });
        return;
      }

      const entries = readdirSync(absPath, { withFileTypes: true })
        .filter((e) => !e.name.startsWith(".")) // Hide dotfiles
        .map((e) => {
          const entryPath = join(relPath, e.name);
          const entryStat = statSync(join(absPath, e.name));
          return {
            name: e.name,
            path: entryPath,
            type: e.isDirectory() ? "directory" : "file",
            size: entryStat.size,
            modified: entryStat.mtime.toISOString(),
          };
        })
        .sort((a, b) => {
          // Directories first, then alphabetical
          if (a.type !== b.type)
            return a.type === "directory" ? -1 : 1;
          return a.name.localeCompare(b.name);
        });

      res.json(entries);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // File content (read-only preview)
  router.get("/api/files/read", (req: Request, res: Response) => {
    const relPath = req.query.path as string;
    if (!relPath) {
      res.status(400).json({ error: "path is required" });
      return;
    }

    const absPath = resolve(HA_CONFIG_DIR, relPath);

    // Prevent directory traversal
    if (!absPath.startsWith(HA_CONFIG_DIR)) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    // Block secrets.yaml
    if (relPath.includes("secrets.yaml")) {
      res.status(403).json({ error: "Access to secrets.yaml is denied" });
      return;
    }

    if (!existsSync(absPath)) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    try {
      const stat = statSync(absPath);
      if (stat.isDirectory()) {
        res.status(400).json({ error: "Not a file" });
        return;
      }

      // Limit file size to 1MB
      if (stat.size > 1024 * 1024) {
        res
          .status(413)
          .json({ error: "File too large (max 1MB)" });
        return;
      }

      const content = readFileSync(absPath, "utf-8");
      res.json({ content, path: relPath, size: stat.size });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Git log
  router.get("/api/git/log", (_req: Request, res: Response) => {
    try {
      const log = execSync(
        'git log --oneline --no-decorate -20 2>/dev/null || echo "no git repo"',
        { cwd: HA_CONFIG_DIR, encoding: "utf-8" }
      );
      const commits = log
        .trim()
        .split("\n")
        .filter((line) => line && line !== "no git repo")
        .map((line) => {
          const [hash, ...msgParts] = line.split(" ");
          return { hash, message: msgParts.join(" ") };
        });
      res.json(commits);
    } catch {
      res.json([]);
    }
  });

  // Git diff
  router.get("/api/git/diff", (req: Request, res: Response) => {
    const commit = req.query.commit as string;
    if (!commit || !/^[a-f0-9]+$/.test(commit)) {
      res.status(400).json({ error: "Invalid commit hash" });
      return;
    }

    try {
      const diff = execSync(`git diff ${commit}~1 ${commit} 2>/dev/null`, {
        cwd: HA_CONFIG_DIR,
        encoding: "utf-8",
      });
      res.json({ diff });
    } catch {
      res.json({ diff: "" });
    }
  });

  return router;
}

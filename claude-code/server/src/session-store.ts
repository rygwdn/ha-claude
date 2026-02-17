import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";

export interface SessionMeta {
  id: string;
  name: string;
  createdAt: string;
  lastActivity: string;
}

const SESSIONS_DIR = "/data/sessions";
const SESSIONS_FILE = `${SESSIONS_DIR}/sessions.json`;

export class SessionStore {
  private sessions: SessionMeta[] = [];

  constructor() {
    mkdirSync(SESSIONS_DIR, { recursive: true });
    this.load();
  }

  private load(): void {
    try {
      if (existsSync(SESSIONS_FILE)) {
        this.sessions = JSON.parse(readFileSync(SESSIONS_FILE, "utf-8"));
      }
    } catch {
      this.sessions = [];
    }
  }

  private save(): void {
    writeFileSync(SESSIONS_FILE, JSON.stringify(this.sessions, null, 2));
  }

  add(id: string, name: string): void {
    const existing = this.sessions.find((s) => s.id === id);
    if (existing) {
      existing.name = name;
      existing.lastActivity = new Date().toISOString();
    } else {
      this.sessions.push({
        id,
        name,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
      });
    }
    this.save();
  }

  updateActivity(id: string): void {
    const session = this.sessions.find((s) => s.id === id);
    if (session) {
      session.lastActivity = new Date().toISOString();
      this.save();
    }
  }

  remove(id: string): void {
    this.sessions = this.sessions.filter((s) => s.id !== id);
    this.save();
  }

  list(): SessionMeta[] {
    return [...this.sessions];
  }

  get(id: string): SessionMeta | undefined {
    return this.sessions.find((s) => s.id === id);
  }
}

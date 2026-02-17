let cachedIngressPath: string | null = null;

export async function getIngressPath(): Promise<string> {
  if (cachedIngressPath !== null) return cachedIngressPath;
  try {
    const res = await fetch("/api/config");
    const data = await res.json();
    cachedIngressPath = data.ingressPath || "";
  } catch {
    cachedIngressPath = "";
  }
  return cachedIngressPath;
}

async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const ingressPath = await getIngressPath();
  return fetch(`${ingressPath}${path}`, options);
}

// Sessions
export interface SessionInfo {
  id: string;
  name: string;
  createdAt: string;
  lastActivity: string;
  alive: boolean;
  clientCount: number;
}

export async function getSessions(): Promise<SessionInfo[]> {
  const res = await apiFetch("/api/sessions");
  return res.json();
}

export async function createSession(
  name?: string
): Promise<{ id: string; name: string }> {
  const res = await apiFetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return res.json();
}

export async function deleteSession(id: string): Promise<void> {
  await apiFetch(`/api/sessions/${id}`, { method: "DELETE" });
}

// Files
export interface FileEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  modified: string;
}

export async function getFiles(path: string = ""): Promise<FileEntry[]> {
  const res = await apiFetch(`/api/files?path=${encodeURIComponent(path)}`);
  return res.json();
}

export async function getFileContent(
  path: string
): Promise<{ content: string; path: string; size: number }> {
  const res = await apiFetch(
    `/api/files/read?path=${encodeURIComponent(path)}`
  );
  return res.json();
}

// Git
export interface GitCommit {
  hash: string;
  message: string;
}

export async function getGitLog(): Promise<GitCommit[]> {
  const res = await apiFetch("/api/git/log");
  return res.json();
}

export async function getGitDiff(
  commit: string
): Promise<{ diff: string }> {
  const res = await apiFetch(
    `/api/git/diff?commit=${encodeURIComponent(commit)}`
  );
  return res.json();
}

// HA API
export interface EntityState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
}

export async function getHAStates(): Promise<EntityState[]> {
  const res = await apiFetch("/api/ha/states");
  return res.json();
}

export async function getHAConfig(): Promise<Record<string, unknown>> {
  const res = await apiFetch("/api/ha/config");
  return res.json();
}

export async function getHALogs(
  lines: number = 100
): Promise<{ lines: string[] }> {
  const res = await apiFetch(`/api/ha/logs?lines=${lines}`);
  return res.json();
}

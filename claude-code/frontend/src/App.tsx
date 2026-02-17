import { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "./components/header/Header";
import { Sidebar } from "./components/sidebar/Sidebar";
import { TerminalPanel } from "./components/terminal/TerminalPanel";
import { ContextPanel } from "./components/context/ContextPanel";
import { TerminalWebSocket } from "./services/websocket";
import {
  getSessions,
  createSession,
  deleteSession,
  getIngressPath,
  type SessionInfo,
} from "./services/ha-api";
import "./styles/theme.css";

export function App() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [contextVisible, setContextVisible] = useState(true);
  const [ingressPath, setIngressPath] = useState("");
  const wsRef = useRef<TerminalWebSocket | null>(null);

  // Load ingress path on mount
  useEffect(() => {
    getIngressPath().then(setIngressPath);
  }, []);

  // Load sessions on mount
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const existing = await getSessions();
        setSessions(existing);

        // Auto-create a session if none exist
        if (existing.length === 0) {
          const session = await createSession("Default");
          setSessions([{ ...session, alive: true, clientCount: 0, createdAt: new Date().toISOString(), lastActivity: new Date().toISOString() }]);
          setCurrentSessionId(session.id);
        } else {
          setCurrentSessionId(existing[0].id);
        }
      } catch {
        // If API isn't available yet, create a local session
        const session = await createSession("Default");
        setSessions([{ ...session, alive: true, clientCount: 0, createdAt: new Date().toISOString(), lastActivity: new Date().toISOString() }]);
        setCurrentSessionId(session.id);
      }
    };
    loadSessions();
  }, []);

  // Connect WebSocket when session changes
  useEffect(() => {
    if (!currentSessionId) return;

    // Disconnect previous
    if (wsRef.current) {
      wsRef.current.disconnect();
    }

    const ws = new TerminalWebSocket(currentSessionId, ingressPath);
    ws.connect();
    wsRef.current = ws;

    return () => {
      ws.disconnect();
    };
  }, [currentSessionId, ingressPath]);

  const handleCreateSession = useCallback(async (name?: string) => {
    try {
      const session = await createSession(name);
      const newSession: SessionInfo = {
        ...session,
        alive: true,
        clientCount: 0,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
      };
      setSessions((prev) => [...prev, newSession]);
      setCurrentSessionId(session.id);
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  }, []);

  const handleSwitchSession = useCallback((id: string) => {
    setCurrentSessionId(id);
  }, []);

  const handleDeleteSession = useCallback(
    async (id: string) => {
      try {
        await deleteSession(id);
        setSessions((prev) => prev.filter((s) => s.id !== id));
        if (currentSessionId === id) {
          const remaining = sessions.filter((s) => s.id !== id);
          setCurrentSessionId(remaining.length > 0 ? remaining[0].id : null);
        }
      } catch (err) {
        console.error("Failed to delete session:", err);
      }
    },
    [currentSessionId, sessions]
  );

  const handleInjectPrompt = useCallback((text: string) => {
    if (wsRef.current) {
      wsRef.current.send(text);
    }
  }, []);

  return (
    <div className="app-container">
      <Header
        sessions={sessions}
        currentSessionId={currentSessionId}
        onCreateSession={handleCreateSession}
        onSwitchSession={handleSwitchSession}
        onDeleteSession={handleDeleteSession}
        onInjectPrompt={handleInjectPrompt}
        sidebarVisible={sidebarVisible}
        contextVisible={contextVisible}
        onToggleSidebar={() => setSidebarVisible((v) => !v)}
        onToggleContext={() => setContextVisible((v) => !v)}
      />

      <div className="main-content">
        <Sidebar
          visible={sidebarVisible}
          onInjectPrompt={handleInjectPrompt}
        />

        <TerminalPanel websocket={wsRef.current} />

        <ContextPanel
          visible={contextVisible}
          onInjectPrompt={handleInjectPrompt}
        />
      </div>
    </div>
  );
}

import { SessionPicker } from "./SessionPicker";
import { QuickActions } from "./QuickActions";
import type { SessionInfo } from "../../services/ha-api";

interface Props {
  sessions: SessionInfo[];
  currentSessionId: string | null;
  onCreateSession: (name?: string) => void;
  onSwitchSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onInjectPrompt: (text: string) => void;
  sidebarVisible: boolean;
  contextVisible: boolean;
  onToggleSidebar: () => void;
  onToggleContext: () => void;
}

export function Header({
  sessions,
  currentSessionId,
  onCreateSession,
  onSwitchSession,
  onDeleteSession,
  onInjectPrompt,
  sidebarVisible,
  contextVisible,
  onToggleSidebar,
  onToggleContext,
}: Props) {
  return (
    <div className="header">
      <button
        className="toggle-btn"
        onClick={onToggleSidebar}
        title={sidebarVisible ? "Hide sidebar" : "Show sidebar"}
      >
        {sidebarVisible ? "\u25C0" : "\u25B6"}
      </button>

      <span className="header-title">Claude Code</span>

      <SessionPicker
        sessions={sessions}
        currentSessionId={currentSessionId}
        onCreateSession={onCreateSession}
        onSwitchSession={onSwitchSession}
        onDeleteSession={onDeleteSession}
      />

      <div className="header-spacer" />

      <QuickActions onInjectPrompt={onInjectPrompt} />

      <button
        className="toggle-btn"
        onClick={onToggleContext}
        title={contextVisible ? "Hide context panel" : "Show context panel"}
      >
        {contextVisible ? "\u25B6" : "\u25C0"}
      </button>
    </div>
  );
}

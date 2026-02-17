import type { SessionInfo } from "../../services/ha-api";

interface Props {
  sessions: SessionInfo[];
  currentSessionId: string | null;
  onCreateSession: (name?: string) => void;
  onSwitchSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
}

export function SessionPicker({
  sessions,
  currentSessionId,
  onCreateSession,
  onSwitchSession,
  onDeleteSession,
}: Props) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <select
        className="select"
        value={currentSessionId || ""}
        onChange={(e) => {
          if (e.target.value) onSwitchSession(e.target.value);
        }}
      >
        {sessions.length === 0 && (
          <option value="">No sessions</option>
        )}
        {sessions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} {!s.alive ? "(exited)" : ""}
          </option>
        ))}
      </select>

      <button
        className="btn btn-small btn-accent"
        onClick={() => onCreateSession()}
        title="New session"
      >
        +
      </button>

      {currentSessionId && (
        <button
          className="btn btn-small btn-danger"
          onClick={() => {
            if (confirm("Destroy this session?")) {
              onDeleteSession(currentSessionId);
            }
          }}
          title="Destroy session"
        >
          x
        </button>
      )}
    </div>
  );
}

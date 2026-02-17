import { useState, useEffect } from "react";
import { getHALogs } from "../../services/ha-api";

export function LogViewer() {
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const result = await getHALogs(200);
      setLines(result.lines || []);
    } catch {
      setLines(["Failed to load logs"]);
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const getLineClass = (line: string): string => {
    if (line.includes("ERROR") || line.includes("error")) return "log-line error";
    if (line.includes("WARNING") || line.includes("warning"))
      return "log-line warning";
    return "log-line";
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
        <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
          {lines.length} lines
        </span>
        <button className="btn btn-small" onClick={refresh} disabled={loading}>
          {loading ? "..." : "Refresh"}
        </button>
      </div>
      <div style={{ maxHeight: "calc(100vh - 180px)", overflow: "auto" }}>
        {lines.map((line, i) => (
          <div key={i} className={getLineClass(line)}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { getGitLog, type GitCommit } from "../../services/ha-api";

export function GitPanel() {
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const log = await getGitLog();
      setCommits(log);
    } catch {
      setCommits([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // Refresh every 30 seconds
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <div className="sidebar-section-header" onClick={refresh}>
        Git History
        <span style={{ fontSize: "10px", fontWeight: "normal" }}>
          {loading ? "..." : `${commits.length}`}
        </span>
      </div>
      <div className="sidebar-section-content">
        {commits.length === 0 && !loading ? (
          <div style={{ padding: "12px", fontSize: "12px", color: "var(--text-muted)" }}>
            No git history (not a git repo)
          </div>
        ) : (
          commits.map((commit) => (
            <div
              key={commit.hash}
              className="file-entry"
              title={`${commit.hash}: ${commit.message}`}
            >
              <span
                className="icon"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  color: "var(--accent)",
                }}
              >
                {commit.hash.slice(0, 7)}
              </span>
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: "11px",
                }}
              >
                {commit.message}
              </span>
            </div>
          ))
        )}
      </div>
    </>
  );
}

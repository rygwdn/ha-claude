import { useState } from "react";

export function DashboardPreview() {
  const [dashboardPath, setDashboardPath] = useState("lovelace");

  // Build the HA dashboard URL relative to the HA instance
  // When running inside HA Ingress, we can access HA at the parent origin
  const haBaseUrl = window.location.origin;
  const dashboardUrl = `${haBaseUrl}/${dashboardPath}?kiosk`;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", gap: "4px", marginBottom: "8px" }}>
        <input
          className="search-input"
          style={{ marginBottom: 0, flex: 1 }}
          type="text"
          placeholder="Dashboard path..."
          value={dashboardPath}
          onChange={(e) => setDashboardPath(e.target.value)}
        />
        <button
          className="btn btn-small"
          onClick={() => {
            // Force iframe reload
            const iframe = document.querySelector(
              ".dashboard-iframe"
            ) as HTMLIFrameElement;
            if (iframe) iframe.src = iframe.src;
          }}
        >
          Refresh
        </button>
      </div>
      <div style={{ flex: 1, minHeight: "200px" }}>
        <iframe
          className="dashboard-iframe"
          src={dashboardUrl}
          title="Dashboard Preview"
          sandbox="allow-same-origin allow-scripts"
        />
      </div>
    </div>
  );
}

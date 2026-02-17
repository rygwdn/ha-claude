import { useState } from "react";
import { EntityBrowser } from "./EntityBrowser";
import { AutomationList } from "./AutomationList";
import { DashboardPreview } from "./DashboardPreview";
import { LogViewer } from "./LogViewer";

interface Props {
  visible: boolean;
  onInjectPrompt: (text: string) => void;
}

type Tab = "entities" | "automations" | "dashboards" | "logs";

export function ContextPanel({ visible, onInjectPrompt }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("entities");

  if (!visible) return null;

  const tabs: { id: Tab; label: string }[] = [
    { id: "entities", label: "Entities" },
    { id: "automations", label: "Automations" },
    { id: "dashboards", label: "Dashboards" },
    { id: "logs", label: "Logs" },
  ];

  return (
    <div className="context-panel">
      <div className="tab-bar">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </div>
        ))}
      </div>
      <div className="tab-content">
        {activeTab === "entities" && (
          <EntityBrowser onInjectPrompt={onInjectPrompt} />
        )}
        {activeTab === "automations" && (
          <AutomationList onInjectPrompt={onInjectPrompt} />
        )}
        {activeTab === "dashboards" && <DashboardPreview />}
        {activeTab === "logs" && <LogViewer />}
      </div>
    </div>
  );
}

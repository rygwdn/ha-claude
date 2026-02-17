import { useState, useEffect, useMemo } from "react";
import { getHAStates, type EntityState } from "../../services/ha-api";

interface Props {
  onInjectPrompt: (text: string) => void;
}

export function AutomationList({ onInjectPrompt }: Props) {
  const [entities, setEntities] = useState<EntityState[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const states = await getHAStates();
        setEntities(
          states.filter((e) => e.entity_id.startsWith("automation."))
        );
      } catch {
        setEntities([]);
      }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return entities;
    const q = search.toLowerCase();
    return entities.filter(
      (e) =>
        e.entity_id.toLowerCase().includes(q) ||
        ((e.attributes.friendly_name as string) || "")
          .toLowerCase()
          .includes(q)
    );
  }, [entities, search]);

  if (loading) {
    return (
      <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
        Loading automations...
      </div>
    );
  }

  return (
    <div>
      <input
        className="search-input"
        type="text"
        placeholder="Search automations..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "4px" }}>
        {filtered.length} automations
      </div>

      {filtered.map((auto) => {
        const name =
          (auto.attributes.friendly_name as string) || auto.entity_id;
        const enabled = auto.state === "on";
        const lastTriggered = auto.attributes.last_triggered as
          | string
          | undefined;

        return (
          <div
            key={auto.entity_id}
            className="entity-entry"
            onClick={() =>
              onInjectPrompt(
                `Show me the configuration for the automation "${name}" (${auto.entity_id}). Use ha-ws automations get ${auto.entity_id}\n`
              )
            }
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: enabled
                    ? "var(--success)"
                    : "var(--text-muted)",
                  flexShrink: 0,
                }}
              />
              <span className="entity-id" style={{ flex: 1 }}>
                {name}
              </span>
            </div>
            {lastTriggered && (
              <div className="entity-name" style={{ paddingLeft: "14px" }}>
                Last: {new Date(lastTriggered).toLocaleString()}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

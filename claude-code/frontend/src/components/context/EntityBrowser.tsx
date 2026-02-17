import { useState, useEffect, useMemo } from "react";
import { getHAStates, type EntityState } from "../../services/ha-api";

interface Props {
  onInjectPrompt: (text: string) => void;
}

export function EntityBrowser({ onInjectPrompt }: Props) {
  const [entities, setEntities] = useState<EntityState[]>([]);
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const states = await getHAStates();
        setEntities(states);
      } catch {
        setEntities([]);
      }
      setLoading(false);
    };
    load();

    // Refresh every 30 seconds
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const domains = useMemo(() => {
    const set = new Set(entities.map((e) => e.entity_id.split(".")[0]));
    return Array.from(set).sort();
  }, [entities]);

  const filtered = useMemo(() => {
    let result = entities;
    if (domainFilter) {
      result = result.filter((e) =>
        e.entity_id.startsWith(`${domainFilter}.`)
      );
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.entity_id.toLowerCase().includes(q) ||
          ((e.attributes.friendly_name as string) || "")
            .toLowerCase()
            .includes(q)
      );
    }
    return result.sort((a, b) => a.entity_id.localeCompare(b.entity_id));
  }, [entities, search, domainFilter]);

  if (loading) {
    return (
      <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
        Loading entities...
      </div>
    );
  }

  return (
    <div>
      <input
        className="search-input"
        type="text"
        placeholder="Search entities..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <select
        className="select"
        style={{ width: "100%", marginBottom: "8px" }}
        value={domainFilter}
        onChange={(e) => setDomainFilter(e.target.value)}
      >
        <option value="">All domains ({entities.length})</option>
        {domains.map((d) => (
          <option key={d} value={d}>
            {d} (
            {entities.filter((e) => e.entity_id.startsWith(`${d}.`)).length})
          </option>
        ))}
      </select>

      <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "4px" }}>
        {filtered.length} entities — click to reference in Claude
      </div>

      {filtered.slice(0, 200).map((entity) => (
        <div
          key={entity.entity_id}
          className="entity-entry"
          onClick={() =>
            onInjectPrompt(
              `Tell me about the entity ${entity.entity_id} and its current state\n`
            )
          }
          title={`${entity.entity_id}: ${entity.state}`}
        >
          <div className="entity-id">{entity.entity_id}</div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="entity-name">
              {(entity.attributes.friendly_name as string) || ""}
            </span>
            <span
              className="entity-state"
              style={{
                color:
                  entity.state === "unavailable"
                    ? "var(--danger)"
                    : entity.state === "on"
                      ? "var(--success)"
                      : undefined,
              }}
            >
              {entity.state}
            </span>
          </div>
        </div>
      ))}

      {filtered.length > 200 && (
        <div style={{ padding: "8px", fontSize: "11px", color: "var(--text-muted)" }}>
          Showing 200 of {filtered.length} — use search to narrow
        </div>
      )}
    </div>
  );
}

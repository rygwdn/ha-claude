#!/usr/bin/env node
/**
 * ha-claude MCP server — exposes Home Assistant tools to Claude Code.
 *
 * Configuration (env vars):
 *   Inside HA add-on:   SUPERVISOR_TOKEN (set automatically)
 *   External access:    HA_URL=http://homeassistant.local:8123
 *                       HA_TOKEN=<long-lived access token>
 *
 * Usage:
 *   # Add to Claude Code via CLI:
 *   claude mcp add ha-claude -e HA_URL=http://homeassistant.local:8123 \
 *                             -e HA_TOKEN=<token> \
 *                             -- npx @rygwdn/ha-claude-mcp
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import {
  restGet,
  restGetText,
  restPost,
  supervisorGet,
  supervisorPost,
  wsCommand,
} from "./ha-client.js";

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    name: "ha_states",
    description: "Get entity states from Home Assistant. Returns all states when no entity_id given, or a single entity's full state + attributes.",
    inputSchema: {
      type: "object" as const,
      properties: {
        entity_id: { type: "string", description: "Optional entity ID (e.g. light.living_room). Omit to list all entities grouped by domain." },
      },
    },
  },
  {
    name: "ha_call_service",
    description: "Call a Home Assistant service (e.g. light.turn_on, climate.set_temperature).",
    inputSchema: {
      type: "object" as const,
      properties: {
        service: { type: "string", description: "Service in domain.action format (e.g. light.turn_on)" },
        data: { type: "object", description: "Service call data (e.g. {entity_id: 'light.living_room', brightness: 200})" },
      },
      required: ["service"],
    },
  },
  {
    name: "ha_config",
    description: "Get Home Assistant core configuration (version, location, installed components, etc.)",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "ha_logs",
    description: "Get recent Home Assistant core log entries.",
    inputSchema: {
      type: "object" as const,
      properties: {
        lines: { type: "number", description: "Number of lines to return (default: 50)" },
      },
    },
  },
  {
    name: "ha_history",
    description: "Get state history for an entity over a time period.",
    inputSchema: {
      type: "object" as const,
      properties: {
        entity_id: { type: "string", description: "Entity ID to get history for" },
        hours: { type: "number", description: "How many hours of history to return (default: 24)" },
      },
      required: ["entity_id"],
    },
  },
  {
    name: "ha_check_config",
    description: "Validate the Home Assistant configuration. Always run this before restarting HA.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "ha_dashboards",
    description: "List or get Lovelace dashboard configurations.",
    inputSchema: {
      type: "object" as const,
      properties: {
        action: { type: "string", enum: ["list", "get"], description: "list: show all dashboards, get: get config of a specific dashboard" },
        url_path: { type: "string", description: "Dashboard URL path for 'get' action (null for the default overview dashboard)" },
      },
      required: ["action"],
    },
  },
  {
    name: "ha_dashboard_save",
    description: "Save a Lovelace dashboard configuration. Use this instead of direct file edits.",
    inputSchema: {
      type: "object" as const,
      properties: {
        url_path: { type: "string", description: "Dashboard URL path (null for overview)" },
        config: { type: "object", description: "Full dashboard configuration object" },
      },
      required: ["config"],
    },
  },
  {
    name: "ha_entities",
    description: "List the entity registry (registered entities with platform info).",
    inputSchema: {
      type: "object" as const,
      properties: {
        domain: { type: "string", description: "Filter by domain (e.g. light, switch)" },
      },
    },
  },
  {
    name: "ha_devices",
    description: "List the device registry.",
    inputSchema: {
      type: "object" as const,
      properties: {
        area: { type: "string", description: "Filter by area name or area_id" },
      },
    },
  },
  {
    name: "ha_areas",
    description: "List all areas in the area registry.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "ha_automations",
    description: "List automations or toggle one on/off.",
    inputSchema: {
      type: "object" as const,
      properties: {
        action: { type: "string", enum: ["list", "toggle"], description: "list: list all automations, toggle: enable/disable one" },
        entity_id: { type: "string", description: "Automation entity ID for toggle (e.g. automation.morning_routine)" },
        enabled: { type: "boolean", description: "true to enable, false to disable (required for toggle)" },
      },
      required: ["action"],
    },
  },
  {
    name: "ha_backup_create",
    description: "Create a Home Assistant partial backup before making changes. Only available inside an HA add-on.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Backup name (optional, auto-generated if omitted)" },
      },
    },
  },
  {
    name: "ha_backup_list",
    description: "List existing Home Assistant backups. Only available inside an HA add-on.",
    inputSchema: { type: "object" as const, properties: {} },
  },
];

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

interface EntityState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
}

interface EntityEntry {
  entity_id: string;
  name?: string | null;
  original_name?: string;
  platform: string;
  disabled_by?: string | null;
}

interface DeviceEntry {
  id: string;
  name?: string;
  manufacturer?: string;
  model?: string;
  area_id?: string | null;
}

interface AreaEntry {
  area_id: string;
  name: string;
}

interface BackupEntry {
  slug: string;
  name: string;
  date: string;
  type: string;
  size: number;
}

async function handleTool(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "ha_states": {
      if (args.entity_id) {
        const state = await restGet(`/states/${args.entity_id}`);
        return JSON.stringify(state, null, 2);
      }
      const states = (await restGet("/states")) as EntityState[];
      const byDomain: Record<string, EntityState[]> = {};
      for (const s of states) {
        const domain = s.entity_id.split(".")[0];
        if (!byDomain[domain]) byDomain[domain] = [];
        byDomain[domain].push(s);
      }
      const lines: string[] = [];
      for (const [domain, entities] of Object.entries(byDomain).sort()) {
        lines.push(`\n${domain} (${entities.length}):`);
        for (const e of entities.sort((a, b) => a.entity_id.localeCompare(b.entity_id))) {
          const name = (e.attributes.friendly_name as string) || "";
          lines.push(`  ${e.entity_id}: ${e.state}${name ? ` (${name})` : ""}`);
        }
      }
      lines.push(`\nTotal: ${states.length} entities`);
      return lines.join("\n");
    }

    case "ha_call_service": {
      const svc = args.service as string;
      const [domain, service] = svc.split(".");
      if (!domain || !service) throw new Error(`Service must be domain.action format, got: ${svc}`);
      const result = await restPost(`/services/${domain}/${service}`, args.data || {});
      return JSON.stringify(result, null, 2);
    }

    case "ha_config":
      return JSON.stringify(await restGet("/config"), null, 2);

    case "ha_logs": {
      const lines = (args.lines as number) || 50;
      const text = await restGetText("/error_log");
      return text.split("\n").slice(-lines).join("\n");
    }

    case "ha_history": {
      const entityId = args.entity_id as string;
      const hours = (args.hours as number) || 24;
      const end = new Date();
      const start = new Date(end.getTime() - hours * 3600 * 1000);
      const history = await restGet(
        `/history/period/${start.toISOString()}?filter_entity_id=${entityId}&end_time=${end.toISOString()}`
      );
      const entries = ((history as EntityState[][])[0]) || [];
      if (!entries.length) return `No history found for ${entityId} in last ${hours}h`;
      const result = [`History for ${entityId} (last ${hours}h):`];
      for (const e of entries) {
        result.push(`  ${new Date(e.last_changed).toLocaleString()}: ${e.state}`);
      }
      result.push(`\n${entries.length} state changes`);
      return result.join("\n");
    }

    case "ha_check_config": {
      const result = (await restPost("/config/core/check_config")) as { result: string; errors: string | null };
      if (result.result === "valid") return "Configuration is valid!";
      return `Configuration errors found:\n${result.errors || "Unknown error"}`;
    }

    case "ha_dashboards": {
      if (args.action === "list") {
        const dashboards = (await wsCommand({ type: "lovelace/dashboards/list" })) as Array<{
          url_path: string | null;
          title: string;
          mode: string;
        }>;
        const lines = ["Lovelace dashboards:", "  default (overview) — mode: storage"];
        for (const d of dashboards) {
          lines.push(`  ${d.url_path || "default"} — ${d.title} (mode: ${d.mode})`);
        }
        return lines.join("\n");
      }
      const config = await wsCommand({ type: "lovelace/config", url_path: args.url_path || null });
      return JSON.stringify(config, null, 2);
    }

    case "ha_dashboard_save": {
      await wsCommand({
        type: "lovelace/config/save",
        url_path: args.url_path || null,
        config: args.config,
      });
      return `Dashboard '${args.url_path || "overview"}' saved successfully`;
    }

    case "ha_entities": {
      const entities = (await wsCommand({ type: "config/entity_registry/list" })) as EntityEntry[];
      const filtered = args.domain
        ? entities.filter((e) => e.entity_id.startsWith(`${args.domain}.`))
        : entities;
      const active = filtered.filter((e) => !e.disabled_by);
      const disabled = filtered.filter((e) => e.disabled_by);
      const lines = [`Entity registry${args.domain ? ` (${args.domain})` : ""}:`];
      for (const e of active.sort((a, b) => a.entity_id.localeCompare(b.entity_id))) {
        const n = e.name || e.original_name || "";
        lines.push(`  ${e.entity_id}: ${n} (${e.platform})`);
      }
      if (disabled.length) lines.push(`\n  + ${disabled.length} disabled entities`);
      lines.push(`\nTotal: ${active.length} active, ${disabled.length} disabled`);
      return lines.join("\n");
    }

    case "ha_devices": {
      const devices = (await wsCommand({ type: "config/device_registry/list" })) as DeviceEntry[];
      let filtered = devices;
      if (args.area) {
        const areas = (await wsCommand({ type: "config/area_registry/list" })) as AreaEntry[];
        const area = areas.find(
          (a) => a.area_id === args.area || a.name.toLowerCase() === (args.area as string).toLowerCase()
        );
        if (!area) throw new Error(`Area "${args.area}" not found`);
        filtered = devices.filter((d) => d.area_id === area.area_id);
      }
      const lines = [`Devices${args.area ? ` in ${args.area}` : ""}:`];
      for (const d of filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""))) {
        const info = [d.manufacturer, d.model].filter(Boolean).join(" ");
        lines.push(`  ${d.name || d.id}${info ? ` — ${info}` : ""}`);
      }
      lines.push(`\nTotal: ${filtered.length} devices`);
      return lines.join("\n");
    }

    case "ha_areas": {
      const areas = (await wsCommand({ type: "config/area_registry/list" })) as AreaEntry[];
      const lines = ["Areas:"];
      for (const a of areas.sort((x, y) => x.name.localeCompare(y.name))) {
        lines.push(`  ${a.name} (${a.area_id})`);
      }
      lines.push(`\nTotal: ${areas.length} areas`);
      return lines.join("\n");
    }

    case "ha_automations": {
      if (args.action === "toggle") {
        if (!args.entity_id || args.enabled === undefined) {
          throw new Error("toggle requires entity_id and enabled");
        }
        const eid = (args.entity_id as string).startsWith("automation.")
          ? args.entity_id as string
          : `automation.${args.entity_id}`;
        const svc = args.enabled ? "turn_on" : "turn_off";
        await restPost(`/services/automation/${svc}`, { entity_id: eid });
        return `Automation ${eid} ${args.enabled ? "enabled" : "disabled"}`;
      }
      const states = (await restGet("/states")) as EntityState[];
      const automations = states.filter((s) => s.entity_id.startsWith("automation."));
      const lines = ["Automations:"];
      for (const a of automations.sort((x, y) => x.entity_id.localeCompare(y.entity_id))) {
        const n = (a.attributes.friendly_name as string) || a.entity_id;
        const status = a.state === "on" ? "enabled" : "disabled";
        const last = a.attributes.last_triggered as string | undefined;
        lines.push(`  [${status}] ${n}${last ? ` (last: ${last})` : ""}`);
        lines.push(`           ${a.entity_id}`);
      }
      lines.push(`\nTotal: ${automations.length} automations`);
      return lines.join("\n");
    }

    case "ha_backup_create": {
      const bname = (args.name as string) || `claude-backup-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")}`;
      const result = (await supervisorPost("/backups/new/partial", {
        name: bname,
        homeassistant: true,
        addons: [],
        folders: ["homeassistant"],
      })) as { data?: { slug?: string } };
      return `Backup created: ${result.data?.slug || "ok"}\nName: ${bname}`;
    }

    case "ha_backup_list": {
      const result = (await supervisorGet("/backups")) as { data?: { backups?: BackupEntry[] } };
      const backups = result.data?.backups || [];
      if (!backups.length) return "No backups found";
      const lines = ["Backups:"];
      for (const b of backups.sort((a, x) => new Date(x.date).getTime() - new Date(a.date).getTime())) {
        const date = new Date(b.date).toLocaleString();
        lines.push(`  ${b.name} — ${date} (${b.type})`);
        lines.push(`    slug: ${b.slug}`);
      }
      lines.push(`\nTotal: ${backups.length} backups`);
      return lines.join("\n");
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------

const server = new Server(
  { name: "ha-claude", version: "0.2.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const result = await handleTool(name, (args || {}) as Record<string, unknown>);
    return { content: [{ type: "text", text: result }] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);

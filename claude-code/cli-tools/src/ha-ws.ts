#!/usr/bin/env node
import { wsCommand } from "./ha-client.js";

const HELP = `ha-ws — Home Assistant WebSocket API CLI

Usage:
  ha-ws dashboards list                     List all Lovelace dashboards
  ha-ws dashboards get [url_path]           Get dashboard config (default: overview)
  ha-ws dashboards save <url_path> <file>   Save dashboard config from JSON file

  ha-ws entities list [--domain <domain>]   List entity registry entries
  ha-ws devices list [--area <area>]        List device registry entries
  ha-ws areas list                          List all areas

  ha-ws automations list                    List all automations
  ha-ws automations get <id>               Get automation config
  ha-ws automations toggle <id> on|off      Enable/disable automation

  ha-ws scenes list                         List all scenes
  ha-ws scripts list                        List all scripts

  ha-ws --help                              Show this help

Environment:
  SUPERVISOR_TOKEN  Set automatically inside HA add-on container

Examples:
  ha-ws dashboards list
  ha-ws dashboards get lovelace-energy
  ha-ws entities list --domain light
  ha-ws automations toggle automation.morning_routine on
`;

import { readFileSync } from "fs";

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

interface AutomationEntry {
  id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    last_triggered?: string;
    current?: number;
  };
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(HELP);
    process.exit(0);
  }

  const category = args[0];
  const action = args[1];

  switch (category) {
    case "dashboards": {
      switch (action) {
        case "list": {
          const dashboards = (await wsCommand({
            type: "lovelace/dashboards/list",
          })) as Array<{
            id: string;
            url_path: string | null;
            title: string;
            mode: string;
          }>;
          console.log("Lovelace dashboards:");
          console.log(
            `  default (overview) — mode: storage`
          );
          for (const d of dashboards) {
            const path = d.url_path || "default";
            console.log(`  ${path} — ${d.title} (mode: ${d.mode})`);
          }
          break;
        }

        case "get": {
          const urlPath = args[2] || null;
          const config = await wsCommand({
            type: "lovelace/config",
            url_path: urlPath,
          });
          console.log(JSON.stringify(config, null, 2));
          break;
        }

        case "save": {
          if (!args[2] || !args[3]) {
            console.error(
              "Usage: ha-ws dashboards save <url_path> <json_file>"
            );
            process.exit(1);
          }
          const urlPath = args[2];
          const filePath = args[3];
          const configData = JSON.parse(readFileSync(filePath, "utf-8"));
          await wsCommand({
            type: "lovelace/config/save",
            url_path: urlPath,
            config: configData,
          });
          console.log(`Dashboard '${urlPath}' saved successfully`);
          break;
        }

        default:
          console.error(
            "Usage: ha-ws dashboards list|get|save"
          );
          process.exit(1);
      }
      break;
    }

    case "entities": {
      if (action !== "list") {
        console.error("Usage: ha-ws entities list [--domain <domain>]");
        process.exit(1);
      }
      const domainIdx = args.indexOf("--domain");
      const domainFilter =
        domainIdx >= 0 ? args[domainIdx + 1] : undefined;

      const entities = (await wsCommand({
        type: "config/entity_registry/list",
      })) as EntityEntry[];

      let filtered = entities;
      if (domainFilter) {
        filtered = entities.filter((e) =>
          e.entity_id.startsWith(`${domainFilter}.`)
        );
      }

      const active = filtered.filter((e) => !e.disabled_by);
      const disabled = filtered.filter((e) => e.disabled_by);

      console.log(`Entity registry${domainFilter ? ` (${domainFilter})` : ""}:`);
      for (const e of active.sort((a, b) =>
        a.entity_id.localeCompare(b.entity_id)
      )) {
        const name = e.name || e.original_name || "";
        console.log(`  ${e.entity_id}: ${name} (${e.platform})`);
      }
      if (disabled.length > 0) {
        console.log(`\n  + ${disabled.length} disabled entities`);
      }
      console.log(
        `\nTotal: ${active.length} active, ${disabled.length} disabled`
      );
      break;
    }

    case "devices": {
      if (action !== "list") {
        console.error("Usage: ha-ws devices list [--area <area>]");
        process.exit(1);
      }
      const areaIdx = args.indexOf("--area");
      const areaFilter = areaIdx >= 0 ? args[areaIdx + 1] : undefined;

      const devices = (await wsCommand({
        type: "config/device_registry/list",
      })) as DeviceEntry[];

      let filtered = devices;
      if (areaFilter) {
        // Get area list to resolve names to IDs
        const areas = (await wsCommand({
          type: "config/area_registry/list",
        })) as AreaEntry[];
        const area = areas.find(
          (a) =>
            a.area_id === areaFilter ||
            a.name.toLowerCase() === areaFilter.toLowerCase()
        );
        if (area) {
          filtered = devices.filter((d) => d.area_id === area.area_id);
        } else {
          console.error(`Area "${areaFilter}" not found`);
          process.exit(1);
        }
      }

      console.log(`Devices${areaFilter ? ` in ${areaFilter}` : ""}:`);
      for (const d of filtered.sort((a, b) =>
        (a.name || "").localeCompare(b.name || "")
      )) {
        const info = [d.manufacturer, d.model].filter(Boolean).join(" ");
        console.log(`  ${d.name || d.id}${info ? ` — ${info}` : ""}`);
      }
      console.log(`\nTotal: ${filtered.length} devices`);
      break;
    }

    case "areas": {
      if (action !== "list") {
        console.error("Usage: ha-ws areas list");
        process.exit(1);
      }
      const areas = (await wsCommand({
        type: "config/area_registry/list",
      })) as AreaEntry[];

      console.log("Areas:");
      for (const a of areas.sort((a, b) => a.name.localeCompare(b.name))) {
        console.log(`  ${a.name} (${a.area_id})`);
      }
      console.log(`\nTotal: ${areas.length} areas`);
      break;
    }

    case "automations": {
      switch (action) {
        case "list": {
          const states = (await wsCommand({
            type: "config/automation/config/list",
          }).catch(async () => {
            // Fallback: get from states API
            const { restGet } = await import("./ha-client.js");
            const allStates = (await restGet("/states")) as AutomationEntry[];
            return allStates.filter((s) =>
              s.id?.toString().startsWith("automation.") ||
              (s as unknown as { entity_id: string }).entity_id?.startsWith("automation.")
            );
          })) as unknown[];

          // Get automation states from REST as fallback
          const { restGet } = await import("./ha-client.js");
          const allStates = (await restGet("/states")) as Array<{
            entity_id: string;
            state: string;
            attributes: {
              friendly_name?: string;
              last_triggered?: string;
            };
          }>;
          const automations = allStates.filter((s) =>
            s.entity_id.startsWith("automation.")
          );

          console.log("Automations:");
          for (const a of automations.sort((x, y) =>
            x.entity_id.localeCompare(y.entity_id)
          )) {
            const name = a.attributes.friendly_name || a.entity_id;
            const status = a.state === "on" ? "enabled" : "disabled";
            const lastTriggered = a.attributes.last_triggered
              ? ` (last: ${new Date(a.attributes.last_triggered).toLocaleString()})`
              : "";
            console.log(`  [${status}] ${name}${lastTriggered}`);
            console.log(`           ${a.entity_id}`);
          }
          console.log(`\nTotal: ${automations.length} automations`);
          break;
        }

        case "get": {
          if (!args[2]) {
            console.error("Usage: ha-ws automations get <automation_id>");
            process.exit(1);
          }
          const id = args[2].replace("automation.", "");
          const config = await wsCommand({
            type: "config/automation/config",
            entity_id: `automation.${id}`,
          }).catch(async () => {
            // Try alternative approach
            const { restGet } = await import("./ha-client.js");
            return restGet(`/config/automation/config/${id}`);
          });
          console.log(JSON.stringify(config, null, 2));
          break;
        }

        case "toggle": {
          if (!args[2] || !args[3]) {
            console.error(
              "Usage: ha-ws automations toggle <entity_id> on|off"
            );
            process.exit(1);
          }
          const entityId = args[2].startsWith("automation.")
            ? args[2]
            : `automation.${args[2]}`;
          const enabled = args[3] === "on";
          const { restPost } = await import("./ha-client.js");
          await restPost(
            `/services/automation/${enabled ? "turn_on" : "turn_off"}`,
            { entity_id: entityId }
          );
          console.log(
            `Automation ${entityId} ${enabled ? "enabled" : "disabled"}`
          );
          break;
        }

        default:
          console.error(
            "Usage: ha-ws automations list|get|toggle"
          );
          process.exit(1);
      }
      break;
    }

    case "scenes": {
      if (action !== "list") {
        console.error("Usage: ha-ws scenes list");
        process.exit(1);
      }
      const { restGet } = await import("./ha-client.js");
      const states = (await restGet("/states")) as Array<{
        entity_id: string;
        state: string;
        attributes: { friendly_name?: string };
      }>;
      const scenes = states.filter((s) => s.entity_id.startsWith("scene."));
      console.log("Scenes:");
      for (const s of scenes.sort((a, b) =>
        a.entity_id.localeCompare(b.entity_id)
      )) {
        const name = s.attributes.friendly_name || s.entity_id;
        console.log(`  ${name} (${s.entity_id})`);
      }
      console.log(`\nTotal: ${scenes.length} scenes`);
      break;
    }

    case "scripts": {
      if (action !== "list") {
        console.error("Usage: ha-ws scripts list");
        process.exit(1);
      }
      const { restGet } = await import("./ha-client.js");
      const states = (await restGet("/states")) as Array<{
        entity_id: string;
        state: string;
        attributes: { friendly_name?: string; last_triggered?: string };
      }>;
      const scripts = states.filter((s) => s.entity_id.startsWith("script."));
      console.log("Scripts:");
      for (const s of scripts.sort((a, b) =>
        a.entity_id.localeCompare(b.entity_id)
      )) {
        const name = s.attributes.friendly_name || s.entity_id;
        const lastRun = s.attributes.last_triggered
          ? ` (last: ${new Date(s.attributes.last_triggered).toLocaleString()})`
          : "";
        console.log(`  ${name}${lastRun}`);
        console.log(`    ${s.entity_id}`);
      }
      console.log(`\nTotal: ${scripts.length} scripts`);
      break;
    }

    default:
      console.error(`Unknown category: ${category}`);
      console.error("Run 'ha-ws --help' for usage");
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});

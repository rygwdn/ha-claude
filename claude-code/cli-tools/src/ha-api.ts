#!/usr/bin/env node
import { restGet, restPost } from "./ha-client.js";

const HELP = `ha-api — Home Assistant REST API CLI

Usage:
  ha-api states                           List all entity states (summary)
  ha-api states <entity_id>               Get single entity state + attributes
  ha-api services                         List all service domains
  ha-api services <domain>                List services for a domain
  ha-api call <domain>.<service> [json]   Call a service
  ha-api config                           Get HA core configuration
  ha-api logs [--lines N]                 Get HA core logs (default: 50 lines)
  ha-api history <entity_id> [--hours N]  Get entity state history (default: 24h)
  ha-api events                           List available event types
  ha-api --help                           Show this help

Environment:
  SUPERVISOR_TOKEN  Set automatically inside HA add-on container

Examples:
  ha-api states light.living_room
  ha-api call light.turn_on '{"entity_id": "light.living_room", "brightness": 128}'
  ha-api services light
  ha-api history sensor.temperature --hours 48
`;

interface EntityState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(HELP);
    process.exit(0);
  }

  const command = args[0];

  switch (command) {
    case "states": {
      if (args[1]) {
        const state = await restGet(`/states/${args[1]}`);
        console.log(JSON.stringify(state, null, 2));
      } else {
        const states = (await restGet("/states")) as EntityState[];
        // Print summary: entity_id, state, friendly_name
        const summary = states.map((s) => ({
          entity_id: s.entity_id,
          state: s.state,
          name: (s.attributes as Record<string, unknown>).friendly_name || "",
        }));
        // Group by domain
        const byDomain: Record<string, typeof summary> = {};
        for (const s of summary) {
          const domain = s.entity_id.split(".")[0];
          if (!byDomain[domain]) byDomain[domain] = [];
          byDomain[domain].push(s);
        }
        for (const [domain, entities] of Object.entries(byDomain).sort()) {
          console.log(`\n${domain} (${entities.length}):`);
          for (const e of entities.sort((a, b) =>
            a.entity_id.localeCompare(b.entity_id)
          )) {
            const name = e.name ? ` (${e.name})` : "";
            console.log(`  ${e.entity_id}: ${e.state}${name}`);
          }
        }
        console.log(`\nTotal: ${states.length} entities`);
      }
      break;
    }

    case "services": {
      const services = (await restGet("/services")) as Array<{
        domain: string;
        services: Record<string, unknown>;
      }>;
      if (args[1]) {
        const domain = services.find((s) => s.domain === args[1]);
        if (!domain) {
          console.error(`Domain "${args[1]}" not found`);
          process.exit(1);
        }
        console.log(`${domain.domain} services:`);
        for (const name of Object.keys(domain.services).sort()) {
          console.log(`  ${domain.domain}.${name}`);
        }
      } else {
        for (const s of services.sort((a, b) =>
          a.domain.localeCompare(b.domain)
        )) {
          const count = Object.keys(s.services).length;
          console.log(`  ${s.domain} (${count} services)`);
        }
        console.log(`\nTotal: ${services.length} domains`);
        console.log("Use 'ha-api services <domain>' for details");
      }
      break;
    }

    case "call": {
      if (!args[1]) {
        console.error("Usage: ha-api call <domain>.<service> [json_data]");
        process.exit(1);
      }
      const [domain, service] = args[1].split(".");
      if (!domain || !service) {
        console.error(
          "Service must be in format: domain.service (e.g., light.turn_on)"
        );
        process.exit(1);
      }
      let data: unknown = undefined;
      if (args[2]) {
        try {
          data = JSON.parse(args[2]);
        } catch {
          console.error("Invalid JSON data");
          process.exit(1);
        }
      }
      const result = await restPost(`/services/${domain}/${service}`, data);
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case "config": {
      const config = await restGet("/config");
      console.log(JSON.stringify(config, null, 2));
      break;
    }

    case "logs": {
      const linesIdx = args.indexOf("--lines");
      const lines =
        linesIdx >= 0 ? parseInt(args[linesIdx + 1], 10) || 50 : 50;
      const res = await fetch("http://supervisor/core/api/error_log", {
        headers: {
          Authorization: `Bearer ${process.env.SUPERVISOR_TOKEN}`,
        },
      });
      const text = await res.text();
      const logLines = text.split("\n");
      const tail = logLines.slice(-lines);
      console.log(tail.join("\n"));
      break;
    }

    case "history": {
      if (!args[1]) {
        console.error("Usage: ha-api history <entity_id> [--hours N]");
        process.exit(1);
      }
      const entityId = args[1];
      const hoursIdx = args.indexOf("--hours");
      const hours =
        hoursIdx >= 0 ? parseInt(args[hoursIdx + 1], 10) || 24 : 24;
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - hours * 3600 * 1000);
      const history = await restGet(
        `/history/period/${startTime.toISOString()}?filter_entity_id=${entityId}&end_time=${endTime.toISOString()}`
      );
      const entries = (history as EntityState[][])[0] || [];
      if (entries.length === 0) {
        console.log(`No history found for ${entityId} in last ${hours}h`);
      } else {
        console.log(`History for ${entityId} (last ${hours}h):`);
        for (const entry of entries) {
          const time = new Date(entry.last_changed).toLocaleString();
          console.log(`  ${time}: ${entry.state}`);
        }
        console.log(`\n${entries.length} state changes`);
      }
      break;
    }

    case "events": {
      const events = await restGet("/events");
      console.log(JSON.stringify(events, null, 2));
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      console.error("Run 'ha-api --help' for usage");
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});

#!/usr/bin/env node
import { supervisorGet, supervisorPost } from "./ha-client.js";

const HELP = `ha-backup — Home Assistant Backup CLI

Usage:
  ha-backup create [name]    Create a partial backup (config + addons)
  ha-backup list             List existing backups
  ha-backup --help           Show this help

Environment:
  SUPERVISOR_TOKEN  Set automatically inside HA add-on container

Examples:
  ha-backup create "before-dashboard-changes"
  ha-backup list
`;

interface BackupEntry {
  slug: string;
  name: string;
  date: string;
  type: string;
  size: number;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(HELP);
    process.exit(0);
  }

  const command = args[0];

  switch (command) {
    case "create": {
      const name =
        args[1] || `claude-backup-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")}`;
      console.log(`Creating backup: ${name}...`);
      const result = (await supervisorPost("/backups/new/partial", {
        name,
        homeassistant: true,
        addons: [],
        folders: ["homeassistant"],
      })) as { data?: { slug?: string } };
      if (result.data?.slug) {
        console.log(`Backup created: ${result.data.slug}`);
        console.log(`Name: ${name}`);
      } else {
        console.log("Backup created successfully");
      }
      break;
    }

    case "list": {
      const result = (await supervisorGet("/backups")) as {
        data?: { backups?: BackupEntry[] };
      };
      const backups = result.data?.backups || [];
      if (backups.length === 0) {
        console.log("No backups found");
      } else {
        console.log("Backups:");
        for (const b of backups.sort(
          (a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        )) {
          const date = new Date(b.date).toLocaleString();
          const sizeMB = (b.size * 1024 * 1024) > 0 ? `${(b.size).toFixed(1)} MB` : "";
          console.log(`  ${b.name} — ${date} (${b.type}) ${sizeMB}`);
          console.log(`    slug: ${b.slug}`);
        }
        console.log(`\nTotal: ${backups.length} backups`);
      }
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      console.error("Run 'ha-backup --help' for usage");
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});

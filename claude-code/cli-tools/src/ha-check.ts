#!/usr/bin/env node
import { restPost } from "./ha-client.js";

const HELP = `ha-check — Home Assistant Configuration Validator

Usage:
  ha-check        Validate HA configuration
  ha-check --help Show this help

Environment:
  SUPERVISOR_TOKEN  Set automatically inside HA add-on container

The tool calls the HA config/check endpoint and reports any errors.
Always run this before restarting Home Assistant.
`;

interface CheckResult {
  errors: string | null;
  result: string;
}

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === "--help" || args[0] === "-h") {
    console.log(HELP);
    process.exit(0);
  }

  console.log("Checking Home Assistant configuration...");

  const result = (await restPost("/config/core/check_config")) as CheckResult;

  if (result.result === "valid") {
    console.log("Configuration is valid!");
    process.exit(0);
  } else {
    console.error("Configuration errors found:");
    console.error(result.errors || "Unknown error");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});

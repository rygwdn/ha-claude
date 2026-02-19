# Claude Code for Home Assistant

## Overview

This add-on gives you a powerful AI coding assistant that deeply understands your Home Assistant installation. Claude Code can edit your configuration files, manage dashboards, create automations, troubleshoot issues, and more — all through a web-based interface accessible from your HA sidebar.

## Getting Started

1. **Set your API key** in the add-on Configuration tab
2. **Start the add-on** and click "Open Web UI"
3. **Try asking Claude** to do something:
   - "Show me all my light entities"
   - "Create a new dashboard for my climate devices"
   - "Fix the errors in my automations"
   - "Add a motion-activated light automation for the hallway"

## Web UI

The add-on uses [claudecodeui](https://github.com/siteboon/claudecodeui), a rich web interface for Claude Code that provides:

- **Chat interface** — Structured conversation with Claude, including rendered tool outputs
- **File browser** — Navigate and open files in your HA config directory
- **Code editor** — CodeMirror-based editor with syntax highlighting
- **Git panel** — View git history and diffs for your configuration changes
- **Session management** — Create and switch between named sessions

## CLI Tools

Claude has access to these tools for interacting with HA:

### ha-api (REST API)
```
ha-api states                    — List all entities
ha-api states <entity_id>        — Get entity details
ha-api services                  — List service domains
ha-api call <service> [json]     — Call a service
ha-api config                    — Get HA configuration
ha-api logs                      — Get error logs
ha-api history <entity_id>       — Get state history
```

### ha-ws (WebSocket API)
```
ha-ws dashboards list            — List Lovelace dashboards
ha-ws dashboards get [path]      — Get dashboard config
ha-ws dashboards save <path> <f> — Save dashboard config
ha-ws entities list              — List entity registry
ha-ws devices list               — List devices
ha-ws areas list                 — List areas
ha-ws automations list           — List automations
ha-ws automations toggle <id>    — Enable/disable
```

### ha-browse (Browser)
```
ha-browse screenshot [path]       — Screenshot an HA page
ha-browse screenshot --full-page  — Full scrollable screenshot
ha-browse screenshot --dark       — Screenshot in dark theme
ha-browse dom [path]              — Get accessibility tree
ha-browse pdf [path]              — Save page as PDF
ha-browse click <sel> [path]      — Click an element
ha-browse eval <js> [path]        — Run JavaScript on page
```

Common paths: `/lovelace/0`, `/lovelace/overview`, `/config/automations`, `/config/entities`, `/developer-tools`, `/map`

### ha-backup & ha-check
```
ha-backup create [name]          — Create a backup
ha-backup list                   — List backups
ha-check                         — Validate configuration
```

## Skills

Claude Code has built-in HA skills that activate when relevant:
- **/ha-yaml** — YAML configuration patterns and templates
- **/ha-api** — API reference and CLI tool documentation
- **/ha-dashboard** — Lovelace dashboard design and card types
- **/ha-diagnose** — Troubleshooting procedures
- **/ha-entities** — Entity and device management

## Sessions

You can create multiple named sessions for different tasks (e.g., "dashboard-work", "automation-debug"). Sessions persist across browser refreshes — close the tab and reopen to resume where you left off.

## Safety

- Claude always validates configuration before restarting HA
- Auto-backup is enabled by default before major changes
- `secrets.yaml` is protected — Claude will never read or modify it
- Default permission mode requires approval for destructive operations
- All access goes through HA authentication (no exposed ports)

## File Access

The add-on has read-write access to:
- `/homeassistant` — Your main config directory
- `/share` — Shared storage
- `/addon_configs` — Add-on configurations

Read-only access to:
- `/ssl` — SSL certificates
- `/media` — Media files
- `/backup` — Backup files

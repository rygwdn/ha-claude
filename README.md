# Claude Code for Home Assistant

A Home Assistant add-on that provides a powerful web UI for interacting with Claude Code, purpose-built for managing your Home Assistant installation.

[![Open your Home Assistant instance and show the add add-on repository dialog with a specific repository URL pre-filled.](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Frygwdn%2Fha-claude)

## Features

- **Web Terminal** — Full xterm.js terminal running Claude Code with HA context
- **HA CLI Tools** — `ha-api`, `ha-ws`, `ha-backup`, `ha-check` for direct HA API access
- **Claude Code Skills** — Domain knowledge for YAML, dashboards, entities, diagnostics
- **File Browser** — Navigate your HA configuration files
- **Entity Browser** — Search and browse all HA entities with live states
- **Automation List** — View all automations with enabled/disabled status
- **Dashboard Preview** — Live preview of Lovelace dashboards
- **Log Viewer** — HA core logs with error highlighting
- **Session Management** — Multiple persistent Claude Code sessions
- **Quick Actions** — One-click config check, backup, restart, and more

## Add-ons

### [Claude Code](./claude-code)

![Supports aarch64 Architecture][aarch64-shield]
![Supports amd64 Architecture][amd64-shield]

_AI coding assistant with deep Home Assistant integration._

## Installation

1. Add this repository to your Home Assistant add-on store:
   - Go to **Settings** > **Add-ons** > **Add-on Store**
   - Click the three dots menu > **Repositories**
   - Add: `https://github.com/rygwdn/ha-claude`
2. Find "Claude Code" in the add-on store and click **Install**
3. In the add-on **Configuration** tab, set your Anthropic API key
4. Start the add-on and click **Open Web UI**

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `anthropic_api_key` | (required) | Your Anthropic API key |
| `model` | `sonnet` | Claude model: sonnet, opus, or haiku |
| `permission_mode` | `default` | Permission handling: default, plan, or bypassPermissions |
| `auto_backup` | `true` | Auto-backup before major changes |

## Architecture

The add-on runs inside a Docker container with:
- **Node.js backend** — Express + WebSocket server managing terminal sessions via node-pty
- **React frontend** — 3-panel layout: file browser, terminal, HA context panels
- **CLI tools** — Shell commands wrapping HA REST and WebSocket APIs
- **Skills** — Claude Code skills providing HA domain knowledge on-demand

Access is through HA Ingress (no exposed ports), with full HA authentication.

## License

Apache License 2.0

[aarch64-shield]: https://img.shields.io/badge/aarch64-yes-green.svg
[amd64-shield]: https://img.shields.io/badge/amd64-yes-green.svg

# Claude Code for Home Assistant

Home Assistant integration for Claude Code — available as a **HA add-on** (web UI), a **Claude Code plugin** (works from any machine), or a **terminal tool** (SSH into your HA box).

[![Open your Home Assistant instance and show the add add-on repository dialog with a specific repository URL pre-filled.](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Frygwdn%2Fha-claude)

## Features

- **Rich Web UI** — Powered by [claudecodeui](https://github.com/siteboon/claudecodeui), with chat interface, file browser, code editor, and structured tool output rendering
- **HA CLI Tools** — `ha-api`, `ha-ws`, `ha-backup`, `ha-check` for direct HA API access
- **Claude Code Skills** — Domain knowledge for YAML, dashboards, entities, diagnostics
- **HA API Proxy** — Frontend can access HA entity states, services, config, and logs
- **Session Management** — Multiple persistent Claude Code sessions
- **Git Integration** — Built-in git panel for tracking configuration changes

## Claude Code Plugin

Use ha-claude as a Claude Code plugin from **any machine** — your laptop, a dev container, or anywhere you run Claude Code. The plugin provides HA skills and an MCP server that connects to your HA instance over the network.

### Install the plugin

```bash
# In a Claude Code session:
/plugin install https://github.com/rygwdn/ha-claude
```

### Configure the MCP server

After installing the plugin, configure it to connect to your HA instance:

```bash
claude mcp add ha-claude \
  -e HA_URL=http://homeassistant.local:8123 \
  -e HA_TOKEN=<long-lived-access-token> \
  -- npx @rygwdn/ha-claude-mcp
```

> Get a long-lived access token from HA: **Profile** → **Security** → **Long-lived access tokens**.

The MCP server exposes all HA tools (`ha_states`, `ha_call_service`, `ha_dashboards`, `ha_automations`, `ha_check_config`, etc.) directly to Claude as first-class tools — no Bash tool required.

### Skills (available everywhere)

Once the plugin is installed, Claude can load HA domain knowledge on demand:

```
/ha-api       — API reference and CLI tool docs
/ha-yaml      — YAML configuration patterns
/ha-dashboard — Lovelace dashboard authoring
/ha-entities  — Entity and device management
/ha-diagnose  — Troubleshooting guide
```

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

## Terminal / SSH Usage

You can also run Claude Code directly inside the **Terminal & SSH add-on** on your HA box and get the same HA-aware CLI tools, CLAUDE.md context, and skills — without the web UI.

### Quick start

SSH into the Terminal add-on, then run:

```bash
curl -fsSL https://raw.githubusercontent.com/rygwdn/ha-claude/main/install.sh | bash
```

Or, if you have the repo cloned locally on the HA box:

```bash
bash /path/to/ha-claude/terminal-setup/install.sh
```

The script will:
1. Install `ha-api`, `ha-ws`, `ha-backup`, and `ha-check` to `~/bin`
2. Add `~/bin` to your `PATH` in `~/.bashrc`
3. Copy `CLAUDE.md` to `/homeassistant/` (skips if already present)
4. Install Claude Code skills to `/homeassistant/.claude/skills/`

### Then start Claude Code

```bash
source ~/.bashrc
export ANTHROPIC_API_KEY=sk-ant-...
cd /homeassistant
claude
```

Claude Code will pick up `CLAUDE.md` automatically and you can use `/ha-api`, `/ha-yaml`, etc.

> **Note:** `ha-browse` (browser/screenshot tool) is not available in terminal sessions. All other tools work identically to the web UI add-on.

### How it works

The Terminal add-on is itself a Home Assistant add-on, so `SUPERVISOR_TOKEN` is already set in the shell environment. The CLI tools (`ha-api`, `ha-ws`, etc.) are bash/Python scripts that talk to the same `http://supervisor/` internal API — no Node.js required.

## Architecture

The add-on runs inside a Docker container with two services:
- **claudecodeui** — Rich web UI ([`@siteboon/claude-code-ui`](https://github.com/siteboon/claudecodeui)) providing chat interface, file browser, code editor, and structured output rendering via the Claude Agent SDK
- **Proxy server** — Thin Node.js proxy that routes HA Ingress traffic to claudecodeui and adds HA API proxy endpoints (`/api/ha/*`)
- **CLI tools** — Shell commands wrapping HA REST and WebSocket APIs, invoked by Claude via its Bash tool
- **Skills** — Claude Code skills providing HA domain knowledge on-demand

Access is through HA Ingress (no exposed ports), with full HA authentication.

## License

Apache License 2.0

[aarch64-shield]: https://img.shields.io/badge/aarch64-yes-green.svg
[amd64-shield]: https://img.shields.io/badge/amd64-yes-green.svg

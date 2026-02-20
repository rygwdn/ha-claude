# Agent Guide — ha-claude

This file helps AI agents (Claude Code and others) understand the repository structure, conventions, and development workflow.

## What this repo is

Three ways to use Claude Code with Home Assistant, all sharing the same skill files and HA domain knowledge:

| Mode | How | Best for |
|------|-----|----------|
| **HA Add-on** | Install from HA add-on store | Full web UI on your HA box |
| **Claude Code Plugin** | `/plugin install github.com/rygwdn/ha-claude` | Using Claude Code from any machine (laptop, etc.) |
| **Terminal / SSH** | `bash terminal-setup/install.sh` | SSH session in the Terminal & SSH add-on |

## Repository layout

```
ha-claude/
├── .claude-plugin/            # Claude Code plugin manifest
│   └── plugin.json
├── .mcp.json                  # Bundled MCP server config (for the plugin)
├── skills/                    # CANONICAL skill files — shared by all three modes
│   ├── ha-api/SKILL.md
│   ├── ha-dashboard/SKILL.md
│   ├── ha-diagnose/SKILL.md
│   ├── ha-entities/SKILL.md
│   └── ha-yaml/SKILL.md
├── mcp-server/                # MCP server (for Claude Code plugin — external HA access)
│   ├── package.json           # Published as @rygwdn/ha-claude-mcp on npm
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts           # MCP server entry point (all HA tools as MCP tools)
│       └── ha-client.ts       # HA REST + WebSocket client (supervisor or external)
├── claude-code/               # HA add-on
│   ├── config.yaml            # Add-on metadata and version (source of truth for version)
│   ├── build.yaml             # Docker build config (base images, labels)
│   ├── Dockerfile             # Multi-stage container build (context = repo root)
│   ├── CHANGELOG.md           # Human-readable release notes
│   ├── cli-tools/             # TypeScript CLI tools compiled into the image
│   │   └── src/
│   │       ├── ha-client.ts   # Shared REST + WebSocket helpers
│   │       ├── ha-api.ts      # REST API tool
│   │       ├── ha-ws.ts       # WebSocket tool
│   │       ├── ha-backup.ts   # Backup tool
│   │       ├── ha-check.ts    # Config validator
│   │       └── ha-browse.ts   # Browser/screenshot tool (Playwright)
│   └── rootfs/                # Files copied into the container
│       ├── etc/cont-init.d/   # S6 init scripts (runs at container start)
│       ├── etc/services.d/    # S6 service definitions (claudecodeui, proxy)
│       └── usr/share/claude-code/
│           └── CLAUDE.md.tmpl # Context file written to /homeassistant/CLAUDE.md
├── terminal-setup/            # Bash/Python tools for SSH sessions (no Node.js needed)
│   ├── install.sh             # One-shot setup script
│   ├── ha-api                 # bash+curl version of the REST tool
│   ├── ha-ws                  # pure-stdlib Python WebSocket tool
│   ├── ha-backup              # bash+curl backup tool
│   ├── ha-check               # bash+curl config validator
│   └── CLAUDE.md.tmpl         # Terminal-adapted context (no ha-browse)
├── repository.yaml            # HA add-on repository descriptor
└── README.md                  # Public documentation
```

## Versioning

- **Single version number** lives in `claude-code/config.yaml` (`version` field).
- All skill files (`skills/*/SKILL.md`) carry a matching `version:` front-matter line.
- `mcp-server/package.json` carries the same version.
- `claude-code/CHANGELOG.md` documents what changed per version.
- When bumping the version, update **all four** locations together.

Current version: see `claude-code/config.yaml`.

## Skills — canonical location

Skills live in `skills/` at the **repo root**. This is the single source of truth. Do not duplicate them elsewhere.

- The **add-on Dockerfile** copies them: `COPY skills /usr/share/claude-code/skills`
- The **terminal install script** copies them from `../skills/`
- The **plugin** uses them directly from the root `skills/` directory

Each `SKILL.md` begins with YAML front-matter:
```yaml
---
name: ha-<topic>
version: "0.2.0"   # must match claude-code/config.yaml
---
```

## CLI tools — three implementations

The same HA tools exist in three forms, all with the same interface:

| Form | Location | Used by |
|------|----------|---------|
| TypeScript (Node.js) | `claude-code/cli-tools/src/` | HA add-on (compiled to JS in Docker image) |
| bash+Python | `terminal-setup/` | SSH / Terminal add-on |
| MCP tools | `mcp-server/src/index.ts` | Claude Code plugin (external) |

Keep all three in sync — same tool names, same flags, same output format.

### Environment variables

| Variable | Supervisor context | External context |
|----------|--------------------|-----------------|
| `SUPERVISOR_TOKEN` | Set automatically | Not available |
| `HA_URL` | Not needed | `http://homeassistant.local:8123` |
| `HA_TOKEN` | Not needed | Long-lived access token from HA |

The `mcp-server/src/ha-client.ts` auto-detects which mode to use (checks `SUPERVISOR_TOKEN` first).

## Docker build

The Dockerfile is in `claude-code/` but **must be built with the repo root as the build context** so it can access the shared `skills/` directory:

```bash
docker build -f claude-code/Dockerfile -t ha-claude .
```

The HA addon builder should be configured to use the repo root as context (see CI configuration).

## How to build/test

There is currently no automated test suite. To validate changes:

```bash
# TypeScript CLI tools (add-on)
cd claude-code/cli-tools && npm install && npm run build

# MCP server
cd mcp-server && npm install && npm run build

# Bash script syntax
bash -n terminal-setup/ha-api
bash -n terminal-setup/ha-backup
bash -n terminal-setup/ha-check
bash -n terminal-setup/install.sh

# Python syntax
python3 -m py_compile terminal-setup/ha-ws

# Docker image (from repo root)
docker build -f claude-code/Dockerfile .
```

## Common tasks for agents

### Add a new HA tool
1. Add `claude-code/cli-tools/src/ha-newtool.ts` (TypeScript entry point)
2. Add `terminal-setup/ha-newtool` (bash or Python equivalent)
3. Add MCP tool handler in `mcp-server/src/index.ts` (TOOLS array + handleTool switch)
4. Add wrapper script in `claude-code/rootfs/usr/local/bin/ha-newtool`
5. Document in both `claude-code/rootfs/usr/share/claude-code/CLAUDE.md.tmpl` and `terminal-setup/CLAUDE.md.tmpl`

### Add or update a skill
1. Edit or create `skills/<name>/SKILL.md` (canonical location)
2. Keep the `version:` front-matter in sync with `claude-code/config.yaml`

### Bump the version
1. Edit `version` in `claude-code/config.yaml`
2. Update `version` in `mcp-server/package.json`
3. Update the `version:` front-matter in each `skills/*/SKILL.md`
4. Add a section to `claude-code/CHANGELOG.md`

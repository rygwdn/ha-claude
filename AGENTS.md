# Agent Guide — ha-claude

This file helps AI agents (Claude Code and others) understand the repository structure, conventions, and development workflow.

## What this repo is

A Home Assistant add-on that integrates Claude Code into HA — giving it direct access to the HA REST and WebSocket APIs, config files, and domain-specific knowledge (skills). There is also a `terminal-setup/` for running the same tools in an SSH session without the web UI.

## Repository layout

```
ha-claude/
├── claude-code/               # The HA add-on
│   ├── config.yaml            # Add-on metadata and version (source of truth for version)
│   ├── build.yaml             # Docker build config (base images, labels)
│   ├── Dockerfile             # Container build
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
│           ├── CLAUDE.md.tmpl # Context file written to /homeassistant/CLAUDE.md
│           └── skills/        # Claude Code skill files (one dir per skill)
│               ├── ha-api/SKILL.md
│               ├── ha-dashboard/SKILL.md
│               ├── ha-diagnose/SKILL.md
│               ├── ha-entities/SKILL.md
│               └── ha-yaml/SKILL.md
├── terminal-setup/            # Bash/Python equivalents for SSH terminal sessions
│   ├── install.sh             # One-shot setup script
│   ├── ha-api                 # bash+curl version
│   ├── ha-ws                  # pure-stdlib Python version
│   ├── ha-backup              # bash+curl version
│   ├── ha-check               # bash+curl version
│   └── CLAUDE.md.tmpl         # Terminal-adapted context (no ha-browse)
├── repository.yaml            # HA add-on repository descriptor
└── README.md                  # Public documentation
```

## Versioning

- **Single version number** lives in `claude-code/config.yaml` (`version` field).
- All skill files (`SKILL.md`) carry a matching `version:` front-matter line.
- `claude-code/CHANGELOG.md` documents what changed per version.
- When bumping the version, update **all three** locations together.

Current version: see `claude-code/config.yaml`.

## CLI tools — TypeScript vs bash/Python

The Docker add-on uses the TypeScript tools in `cli-tools/src/` (compiled to JS). The terminal setup uses the bash/Python equivalents in `terminal-setup/`. Keep the two in sync — same CLI interface, same flags, same output format.

Key environment variables both share:
- `SUPERVISOR_TOKEN` — provided automatically by the HA supervisor to all add-ons (including Terminal & SSH)
- `http://supervisor/core/api` — HA REST API base URL (only reachable from within a HA add-on)
- `ws://supervisor/core/websocket` — HA WebSocket URL

## Skills

Skills are Claude Code skill files (`SKILL.md`) that load domain knowledge on demand. They live in `rootfs/usr/share/claude-code/skills/` and are copied to `/homeassistant/.claude/skills/` at container start.

Each `SKILL.md` begins with YAML front-matter:
```yaml
---
name: ha-<topic>
version: <same as addon version>
---
```

## How to build/test

There is currently no local test suite. To validate changes:
1. Ensure TypeScript tools compile: `cd claude-code/cli-tools && npm install && npm run build`
2. Check bash scripts for syntax: `bash -n terminal-setup/ha-api && bash -n terminal-setup/ha-backup && bash -n terminal-setup/ha-check && bash -n terminal-setup/install.sh`
3. Check Python syntax: `python3 -m py_compile terminal-setup/ha-ws`
4. Build the Docker image (requires Docker + HA build toolchain)

## Common tasks for agents

### Add a new CLI tool
1. Add `src/ha-newtool.ts` in `cli-tools/src/` (TypeScript, Node.js entry point)
2. Add `terminal-setup/ha-newtool` (bash or Python equivalent)
3. Add wrapper script in `rootfs/usr/local/bin/ha-newtool`
4. Document in `rootfs/usr/share/claude-code/CLAUDE.md.tmpl` and `terminal-setup/CLAUDE.md.tmpl`

### Add or update a skill
1. Edit or create `rootfs/usr/share/claude-code/skills/<name>/SKILL.md`
2. Keep the `version:` front-matter in sync with `config.yaml`

### Bump the version
1. Edit `version` in `claude-code/config.yaml`
2. Update the `version:` front-matter in each `skills/*/SKILL.md`
3. Add a section to `claude-code/CHANGELOG.md`

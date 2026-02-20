## 0.2.0

- Terminal/SSH support: bash+Python CLI tools (`ha-api`, `ha-ws`, `ha-backup`, `ha-check`) that work without Node.js inside the Terminal & SSH add-on
- `terminal-setup/install.sh`: one-shot setup script to install tools, CLAUDE.md, and skills in an SSH session
- `AGENTS.md`: repository guide for AI agents working in this codebase
- Skill files now include YAML front-matter with `name` and `version` fields

## 0.1.0

- Initial release
- Rich web UI powered by claudecodeui with chat interface, file browser, code editor, and git panel
- CLI tools for HA REST API and WebSocket operations: ha-api, ha-ws, ha-backup, ha-check, ha-browse
- ha-browse: headless Chromium browser tool for screenshotting dashboards and inspecting the HA UI
- Claude Code skills for HA YAML, dashboards, entities, diagnostics, and API usage
- Session management for multiple parallel Claude Code sessions

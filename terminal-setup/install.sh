#!/usr/bin/env bash
# install.sh — Set up HA Claude tools for a terminal/SSH session on Home Assistant
#
# Run this script once inside the HA Terminal add-on (SSH session):
#   bash <(curl -fsSL https://raw.githubusercontent.com/rygwdn/ha-claude/main/terminal-setup/install.sh)
#
# Or, if you have the repo cloned:
#   bash terminal-setup/install.sh

set -euo pipefail

REPO_RAW="https://raw.githubusercontent.com/rygwdn/ha-claude/main/terminal-setup"
REPO_RAW_ROOT="https://raw.githubusercontent.com/rygwdn/ha-claude/main"
TOOLS=(ha-api ha-ws)
INSTALL_DIR="${HOME}/bin"
HA_CONFIG_DIR="/homeassistant"

# ── Detect mode: local or remote ─────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "${SCRIPT_DIR}/ha-api" ]]; then
  LOCAL_MODE=true
else
  LOCAL_MODE=false
fi

info()  { echo "[install] $*"; }
warn()  { echo "[install] WARNING: $*" >&2; }
error() { echo "[install] ERROR: $*" >&2; exit 1; }

# ── Pre-flight checks ─────────────────────────────────────────────────────────
info "Checking environment..."

if [[ -z "${SUPERVISOR_TOKEN:-}" ]]; then
  error "SUPERVISOR_TOKEN is not set. This script must run inside the HA Terminal add-on."
fi

if ! command -v curl &>/dev/null; then
  error "curl is required but not found."
fi

if ! command -v python3 &>/dev/null; then
  warn "python3 not found — ha-ws will not work."
fi

info "Environment OK (SUPERVISOR_TOKEN is set)"

# ── Install CLI tools ─────────────────────────────────────────────────────────
mkdir -p "$INSTALL_DIR"

for tool in "${TOOLS[@]}"; do
  dest="${INSTALL_DIR}/${tool}"
  if [[ "$LOCAL_MODE" == true ]]; then
    cp "${SCRIPT_DIR}/${tool}" "$dest"
  else
    info "Downloading ${tool}..."
    curl -fsSL "${REPO_RAW}/${tool}" -o "$dest"
  fi
  chmod +x "$dest"
  info "Installed ${tool} → ${dest}"
done

# ── Add ~/bin to PATH ─────────────────────────────────────────────────────────
# Add to .bashrc if not already there
BASHRC="${HOME}/.bashrc"
PATH_LINE='export PATH="$HOME/bin:$PATH"'

if ! grep -qF 'HOME/bin' "$BASHRC" 2>/dev/null; then
  echo "" >> "$BASHRC"
  echo "# ha-claude terminal tools" >> "$BASHRC"
  echo "$PATH_LINE" >> "$BASHRC"
  info "Added ~/bin to PATH in ${BASHRC}"
fi

# Export immediately for this session
export PATH="${INSTALL_DIR}:${PATH}"

# ── Install homeassistant-cli (hass-cli) ──────────────────────────────────────
info "Installing homeassistant-cli..."
if pip3 install homeassistant-cli --quiet 2>/dev/null || pip install homeassistant-cli --quiet 2>/dev/null; then
  info "homeassistant-cli installed"
else
  warn "Could not install homeassistant-cli — hass-cli commands will not work"
fi

# Configure hass-cli to use the supervisor API automatically
HASS_ENV_LINES='# hass-cli: use supervisor API
export HASS_SERVER="http://supervisor/core"
export HASS_TOKEN="$SUPERVISOR_TOKEN"'

if ! grep -qF 'HASS_SERVER' "$BASHRC" 2>/dev/null; then
  echo "" >> "$BASHRC"
  echo "$HASS_ENV_LINES" >> "$BASHRC"
  info "Added HASS_SERVER/HASS_TOKEN to ${BASHRC}"
fi

# Export immediately for this session
export HASS_SERVER="http://supervisor/core"
export HASS_TOKEN="$SUPERVISOR_TOKEN"

# ── Set up CLAUDE.md ──────────────────────────────────────────────────────────
CLAUDE_MD="${HA_CONFIG_DIR}/CLAUDE.md"

if [[ ! -f "$CLAUDE_MD" ]]; then
  if [[ "$LOCAL_MODE" == true ]]; then
    src="${SCRIPT_DIR}/CLAUDE.md.tmpl"
    if [[ -f "$src" ]]; then
      cp "$src" "$CLAUDE_MD"
    else
      # Fall back to the add-on template
      addon_tmpl="${SCRIPT_DIR}/../claude-code/rootfs/usr/share/claude-code/CLAUDE.md.tmpl"
      if [[ -f "$addon_tmpl" ]]; then
        cp "$addon_tmpl" "$CLAUDE_MD"
      fi
    fi
  else
    curl -fsSL "${REPO_RAW}/CLAUDE.md.tmpl" -o "$CLAUDE_MD" 2>/dev/null || true
  fi

  if [[ -f "$CLAUDE_MD" ]]; then
    info "Created ${CLAUDE_MD}"
  else
    warn "Could not create CLAUDE.md — create it manually if needed"
  fi
else
  info "CLAUDE.md already exists at ${CLAUDE_MD}, skipping"
fi

# ── Install Claude Code skills ────────────────────────────────────────────────
SKILLS_DIR="${HA_CONFIG_DIR}/.claude/skills"

if [[ "$LOCAL_MODE" == true ]]; then
  # Skills are at the repo root (canonical location)
  ROOT_SKILLS="${SCRIPT_DIR}/../skills"
  if [[ -d "$ROOT_SKILLS" ]]; then
    mkdir -p "$SKILLS_DIR"
    for skill_dir in "${ROOT_SKILLS}"/*/; do
      skill_name="$(basename "$skill_dir")"
      if [[ ! -d "${SKILLS_DIR}/${skill_name}" ]]; then
        cp -r "$skill_dir" "${SKILLS_DIR}/${skill_name}"
        info "Installed skill: ${skill_name}"
      else
        info "Skill already installed: ${skill_name}"
      fi
    done
  else
    warn "Skills directory not found at ${ROOT_SKILLS}"
  fi
else
  # Remote install: download each skill from GitHub
  SKILLS=(ha-api ha-dashboard ha-diagnose ha-entities ha-yaml)
  mkdir -p "$SKILLS_DIR"
  for skill in "${SKILLS[@]}"; do
    skill_dest="${SKILLS_DIR}/${skill}"
    if [[ ! -d "$skill_dest" ]]; then
      mkdir -p "$skill_dest"
      curl -fsSL "${REPO_RAW_ROOT}/skills/${skill}/SKILL.md" -o "${skill_dest}/SKILL.md" 2>/dev/null || \
        warn "Could not download skill: ${skill}"
      info "Installed skill: ${skill}"
    else
      info "Skill already installed: ${skill}"
    fi
  done
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  HA Claude terminal tools installed!"
echo ""
echo "  Custom tools in ${INSTALL_DIR}:"
for tool in "${TOOLS[@]}"; do
  echo "    • ${tool}"
done
echo ""
echo "  Built-in HA CLI tools (always available):"
echo "    • ha core check        — validate config"
echo "    • ha core logs         — view logs"
echo "    • ha core restart      — restart HA"
echo "    • ha backups list      — list backups"
echo "    • ha backups new       — create backup"
echo "    • hass-cli state list  — list entity states"
echo "    • hass-cli service call — call services"
echo "    • hass-cli device list — list devices"
echo "    • hass-cli area list   — list areas"
echo ""
echo "  Next steps:"
echo "    1. Reload your shell:  source ~/.bashrc"
echo "    2. Install Claude Code: npm install -g @anthropic-ai/claude-code"
echo "       (or: npx @anthropic-ai/claude-code)"
echo "    3. Set your API key:   export ANTHROPIC_API_KEY=sk-ant-..."
echo "    4. Run Claude Code:    claude"
echo ""
echo "  Claude Code will read ${CLAUDE_MD}"
echo "  and skills from ${SKILLS_DIR}/"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

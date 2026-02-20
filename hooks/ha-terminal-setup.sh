#!/usr/bin/env bash
# ha-terminal-setup.sh — Plugin SessionStart hook
#
# Auto-configures HA Claude terminal tools when the plugin is used inside
# a Home Assistant Terminal & SSH add-on session.
#
# Detection: HA Terminal add-ons set SUPERVISOR_TOKEN automatically.
# Skip silently in any other environment.

set -euo pipefail

# ── Not in HA Terminal — skip ─────────────────────────────────────────────────
if [[ -z "${SUPERVISOR_TOKEN:-}" ]]; then
  exit 0
fi

# ── Already configured — skip ─────────────────────────────────────────────────
if command -v ha-api &>/dev/null && [[ -d /homeassistant/.claude/skills/ha-api ]]; then
  exit 0
fi

echo "[ha-claude] Detected HA Terminal environment — running first-time setup..."

# ── Locate install.sh: plugin dir → GitHub fallback ──────────────────────────
# When installed as a plugin, the plugin files live under ~/.claude/plugins/.
# Try to find install.sh relative to this script first (works if the plugin
# exposes $CLAUDE_PLUGIN_DIR, or if the hook runs from the plugin root).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_SH=""

# Check common plugin install paths
for candidate in \
  "${SCRIPT_DIR}/../terminal-setup/install.sh" \
  "${CLAUDE_PLUGIN_DIR:-__none__}/terminal-setup/install.sh" \
  "${HOME}/.claude/plugins/ha-claude/terminal-setup/install.sh"
do
  if [[ -f "$candidate" ]]; then
    INSTALL_SH="$(realpath "$candidate")"
    break
  fi
done

if [[ -n "$INSTALL_SH" ]]; then
  echo "[ha-claude] Running ${INSTALL_SH}"
  bash "$INSTALL_SH"
else
  echo "[ha-claude] Local install.sh not found — downloading from GitHub..."
  bash <(curl -fsSL https://raw.githubusercontent.com/rygwdn/ha-claude/main/terminal-setup/install.sh)
fi

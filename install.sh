#!/usr/bin/env bash
# One-liner installer for ha-claude terminal tools.
#
# Usage (inside the HA Terminal / SSH add-on):
#   curl -fsSL https://raw.githubusercontent.com/rygwdn/ha-claude/main/install.sh | bash

set -euo pipefail

INSTALLER_URL="https://raw.githubusercontent.com/rygwdn/ha-claude/main/terminal-setup/install.sh"

tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT

curl -fsSL "$INSTALLER_URL" -o "$tmp"
bash "$tmp"

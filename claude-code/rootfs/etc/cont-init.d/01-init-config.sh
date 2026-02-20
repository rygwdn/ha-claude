#!/usr/bin/with-contenv bashio
# shellcheck shell=bash

bashio::log.info "Initializing Claude Code add-on..."

# Read add-on configuration
ANTHROPIC_API_KEY=$(bashio::config 'anthropic_api_key')
MODEL=$(bashio::config 'model')
PERMISSION_MODE=$(bashio::config 'permission_mode')
AUTO_BACKUP=$(bashio::config 'auto_backup')

# Get ingress port
INGRESS_PORT=$(bashio::addon.ingress_port)
bashio::log.info "Ingress port: ${INGRESS_PORT}"

# Copy CLAUDE.md to homeassistant config dir (if not already present)
if [ ! -f /homeassistant/CLAUDE.md ]; then
    cp /usr/share/claude-code/CLAUDE.md.tmpl /homeassistant/CLAUDE.md
    bashio::log.info "Created /homeassistant/CLAUDE.md"
else
    bashio::log.info "CLAUDE.md already exists, skipping"
fi

# Copy skills to homeassistant config dir (if not already present)
if [ ! -d /homeassistant/.claude/skills ]; then
    mkdir -p /homeassistant/.claude/skills
    cp -r /usr/share/claude-code/skills/* /homeassistant/.claude/skills/
    bashio::log.info "Installed Claude Code skills to /homeassistant/.claude/skills/"
else
    bashio::log.info "Skills directory already exists, checking for updates..."
    for skill_dir in /usr/share/claude-code/skills/*/; do
        skill_name=$(basename "$skill_dir")
        if [ ! -d "/homeassistant/.claude/skills/${skill_name}" ]; then
            cp -r "$skill_dir" "/homeassistant/.claude/skills/${skill_name}"
            bashio::log.info "Added new skill: ${skill_name}"
        fi
    done
fi

# Create data directories
mkdir -p /data/sessions /data/claudecodeui /root/.claude

# Initialize git in homeassistant config if not present
if [ ! -d /homeassistant/.git ]; then
    bashio::log.info "Initializing git repository in /homeassistant..."
    cd /homeassistant || exit 1
    git init
    git add -A
    git commit -m "Initial commit (Claude Code add-on)" 2>/dev/null || true
    bashio::log.info "Git repository initialized"
fi

# Configure claudecodeui environment
# claudecodeui reads ANTHROPIC_API_KEY from env and operates on the cwd
# We set the working directory to /homeassistant in its S6 run script

bashio::log.info "Claude Code add-on initialized successfully"

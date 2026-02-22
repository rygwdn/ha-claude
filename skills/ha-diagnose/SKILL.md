---
name: ha-diagnose
version: "0.2.0"
---

# Home Assistant Diagnostics & Troubleshooting

You are an expert in diagnosing and fixing Home Assistant issues. Use this knowledge when troubleshooting.

## Diagnostic Workflow

### 1. Check Configuration
```bash
ha core check
```
Always start here. Catches YAML syntax errors, invalid entity references, and integration issues.

### 2. Check Logs
```bash
ha core logs
```
Look for: ERROR, WARNING, integration names, entity IDs.

### 3. Check Entity States
```bash
hass-cli state get <entity_id>
```
Look for: `unavailable`, `unknown`, stale timestamps.

### 4. Check Entity History
```bash
ha-api history <entity_id> --hours 48
```
Identify when an entity went unavailable or started misbehaving.

## Common Issues & Solutions

### Entity Shows "Unavailable"
1. Check if the device is powered on and connected
2. Check integration logs: `ha core logs` (filter for integration name)
3. Check if the integration needs reconfiguration
4. Try reloading the integration: `hass-cli service call homeassistant reload_config_entry`

### Automation Not Triggering
1. Check automation is enabled: `ha-ws automations list`
2. Check automation config: `ha-ws automations get <id>`
3. Verify trigger entity exists and has expected states
4. Check automation mode (single vs restart vs parallel)
5. Check conditions are met at trigger time
6. Look for errors in logs after manually triggering

### Template Errors
1. Test templates via API: `curl -X POST http://supervisor/core/api/template -d '{"template": "{{ states(\"sensor.temp\") }}"}'`
2. Common issues:
   - Missing quotes around entity_id in `states()`
   - Not handling `unknown`/`unavailable` states
   - Missing `float()` conversion for numeric comparisons

### Dashboard Not Loading
1. Check Lovelace config: `ha-ws dashboards get`
2. Validate JSON structure
3. Check for references to non-existent entities
4. Check for custom cards that aren't installed

### Integration Won't Load
1. Check logs for the specific integration
2. Verify required dependencies are installed
3. For custom integrations: check `manifest.json` for version compatibility
4. Try removing and re-adding the integration

### High CPU/Memory Usage
1. Check which integrations are polling frequently
2. Look for template sensors with expensive computations
3. Check for recursive automations
4. Review automation history for rapid-fire executions

## Log Analysis Patterns

### Error Categories
- `homeassistant.core` — Core framework errors
- `homeassistant.components.<integration>` — Integration-specific errors
- `homeassistant.helpers.entity` — Entity lifecycle errors
- `homeassistant.loader` — Loading/import errors

### Key Log Messages
- `Setup of <integration> is taking over 10 seconds` — Slow integration
- `Platform <platform> not ready yet` — Dependency issue
- `Unable to connect` — Network/device connectivity
- `Authentication failed` — Credentials issue
- `Entity not found` — Stale reference in config

## Safe Restart Procedure

```bash
# 1. Create backup
ha backups new --name "pre-restart"

# 2. Validate config
ha core check

# 3. Only if config is valid, restart
ha core restart

# 4. Monitor logs for errors during startup
sleep 30
ha core logs
```

## Performance Checks

### Check Entity Count
```bash
hass-cli state list | wc -l    # Total entity count
```
More than 1000 entities may cause performance issues.

### Check Automation Count
```bash
ha-ws automations list | tail -1    # Shows total
```

### Check for Unavailable Entities
```bash
hass-cli state list | grep unavailable
```
Many unavailable entities can slow down HA.

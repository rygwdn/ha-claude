---
name: ha-api
version: "0.2.0"
---

# Home Assistant API & CLI Tools Reference

## CLI Tools Available

### hass-cli — Official Home Assistant CLI

Configured automatically to use the supervisor API via `HASS_SERVER`/`HASS_TOKEN`.

```bash
# Entity states
hass-cli state list                          # All entity states
hass-cli state get <entity_id>               # Single entity state + attributes
hass-cli state list --output json            # JSON output for parsing

# Services
hass-cli service list                        # All service domains
hass-cli service list <domain>.*             # Services for a domain
hass-cli service call <domain> <service> --data entity_id=light.living_room

# Registry
hass-cli entity list                         # Entity registry
hass-cli entity list <pattern>               # Filter by pattern
hass-cli device list                         # Device registry
hass-cli area list                           # All areas
```

### ha — HA OS Supervisor CLI (always available)

```bash
ha core check          # Validate configuration (run before restart!)
ha core logs           # View HA core logs
ha core restart        # Restart HA core
ha core restart --safe-mode  # Restart in safe mode

ha backups list        # List all backups
ha backups new --name "before-changes"  # Create a backup
ha backups restore <slug>               # Restore a backup
```

### ha-ws — WebSocket API (dashboards + automations)

```bash
# Dashboards (Lovelace)
ha-ws dashboards list                     # List all dashboards
ha-ws dashboards get [url_path]           # Get dashboard config JSON
ha-ws dashboards save <url_path> <file>   # Save dashboard from JSON file

# Automations
ha-ws automations list                    # List all automations with status
ha-ws automations get <id>               # Get automation config
ha-ws automations toggle <id> on|off      # Enable/disable automation

# Other
ha-ws scenes list                         # List all scenes
ha-ws scripts list                        # List all scripts
```

### ha-api — Custom REST helpers

Covers operations not in hass-cli or the ha CLI:

```bash
ha-api call <domain>.<service> [json]   # Call a service with raw JSON body
ha-api history <entity_id> [--hours N]  # Entity state history (default: 24h)
ha-api config                           # HA core configuration
```

## REST API Reference

Base URL: `http://supervisor/core/api`
Auth: `Authorization: Bearer $SUPERVISOR_TOKEN`

### Key Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/states | All entity states |
| GET | /api/states/{entity_id} | Single entity state |
| POST | /api/states/{entity_id} | Set entity state |
| GET | /api/services | List all services |
| POST | /api/services/{domain}/{service} | Call a service |
| GET | /api/config | HA core config |
| POST | /api/config/core/check_config | Validate config |
| GET | /api/history/period/{start} | State history |
| GET | /api/logbook/{start} | Logbook entries |
| GET | /api/error_log | Error log text |
| POST | /api/template | Render a template |

### Supervisor API
Base URL: `http://supervisor`
| Method | Path | Description |
|--------|------|-------------|
| GET | /backups | List backups |
| POST | /backups/new/partial | Create partial backup |
| POST | /core/restart | Restart HA Core |
| POST | /core/stop | Stop HA Core |
| GET | /core/info | Core info |
| GET | /addons | List add-ons |
| GET | /host/info | Host info |

## WebSocket API Reference

Connect to: `ws://supervisor/core/websocket`
Auth message: `{"type": "auth", "access_token": "$SUPERVISOR_TOKEN"}`

### Key Message Types
| Type | Description |
|------|-------------|
| `lovelace/dashboards/list` | List dashboards |
| `lovelace/config` | Get dashboard config |
| `lovelace/config/save` | Save dashboard config |
| `config/entity_registry/list` | Entity registry |
| `config/device_registry/list` | Device registry |
| `config/area_registry/list` | Area registry |
| `subscribe_events` | Subscribe to events |

## Common Patterns

### Call a service
```bash
# Preferred: hass-cli (structured args)
hass-cli service call light turn_on --data entity_id=light.living_room brightness=200

# Alternative: ha-api (raw JSON)
ha-api call light.turn_on '{"entity_id": "light.living_room", "brightness": 200}'
ha-api call climate.set_temperature '{"entity_id": "climate.thermostat", "temperature": 21}'
ha-api call notify.mobile_app '{"message": "Hello!", "title": "Test"}'
```

### Dashboard workflow
```bash
# 1. List dashboards to find url_path
ha-ws dashboards list

# 2. Get current config
ha-ws dashboards get my-dashboard > /tmp/dashboard.json

# 3. Edit the file
# ... modify /tmp/dashboard.json ...

# 4. Save back
ha-ws dashboards save my-dashboard /tmp/dashboard.json
```

### Safe restart workflow
```bash
# 1. Check config first
ha core check

# 2. Only if valid, restart
ha core restart
```

# Home Assistant API & CLI Tools Reference

## CLI Tools Available

### ha-api — REST API

```bash
ha-api states                           # List all entities (grouped by domain)
ha-api states <entity_id>               # Full state + attributes for one entity
ha-api services                         # List all service domains
ha-api services <domain>                # List services for a domain
ha-api call <domain>.<service> [json]   # Call a service with optional data
ha-api config                           # Get HA core configuration
ha-api logs [--lines N]                 # Get HA core logs (default: 50)
ha-api history <entity_id> [--hours N]  # Get entity state history (default: 24h)
ha-api events                           # List available event types
```

### ha-ws — WebSocket API

```bash
# Dashboards (Lovelace)
ha-ws dashboards list                     # List all dashboards
ha-ws dashboards get [url_path]           # Get dashboard config JSON
ha-ws dashboards save <url_path> <file>   # Save dashboard from JSON file

# Entity/Device/Area Registry
ha-ws entities list [--domain <domain>]   # List entity registry
ha-ws devices list [--area <area>]        # List device registry
ha-ws areas list                          # List all areas

# Automations
ha-ws automations list                    # List all automations with status
ha-ws automations get <id>               # Get automation config
ha-ws automations toggle <id> on|off      # Enable/disable automation

# Other
ha-ws scenes list                         # List all scenes
ha-ws scripts list                        # List all scripts
```

### ha-backup — Backup Management

```bash
ha-backup create [name]    # Create partial backup (config + folders)
ha-backup list             # List existing backups
```

### ha-check — Config Validation

```bash
ha-check    # Validate HA configuration (run before restart!)
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
ha-check

# 2. Only if valid, restart
ha-api call homeassistant.restart
```

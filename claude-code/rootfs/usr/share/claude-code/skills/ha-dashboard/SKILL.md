# Home Assistant Lovelace Dashboard Expert

You are an expert in Home Assistant Lovelace dashboards. Use this knowledge when creating or modifying dashboards.

## Dashboard Workflow

```bash
# List dashboards
ha-ws dashboards list

# Get current config as JSON
ha-ws dashboards get <url_path> > /tmp/dashboard.json

# Edit the JSON config...

# Save modified config
ha-ws dashboards save <url_path> /tmp/dashboard.json
```

**Important**: Always use `ha-ws dashboards save` to modify dashboards. Do NOT edit `.storage/lovelace*` files directly.

## Dashboard Structure

```json
{
  "title": "Home",
  "views": [
    {
      "title": "Overview",
      "path": "overview",
      "icon": "mdi:home",
      "badges": [],
      "cards": [...]
    }
  ]
}
```

## Common Card Types

### Entities Card
```json
{
  "type": "entities",
  "title": "Living Room",
  "entities": [
    "light.living_room",
    "switch.tv_power",
    {"entity": "sensor.temperature", "name": "Temp", "icon": "mdi:thermometer"}
  ]
}
```

### Grid Card (Layout Container)
```json
{
  "type": "grid",
  "columns": 3,
  "square": false,
  "cards": [
    {"type": "button", "entity": "light.bedroom", "name": "Bedroom"},
    {"type": "button", "entity": "light.kitchen", "name": "Kitchen"},
    {"type": "button", "entity": "light.bathroom", "name": "Bathroom"}
  ]
}
```

### Button Card
```json
{
  "type": "button",
  "entity": "switch.coffee_maker",
  "name": "Coffee",
  "icon": "mdi:coffee",
  "tap_action": {"action": "toggle"},
  "show_state": true
}
```

### Thermostat Card
```json
{
  "type": "thermostat",
  "entity": "climate.living_room"
}
```

### Weather Forecast Card
```json
{
  "type": "weather-forecast",
  "entity": "weather.home",
  "show_forecast": true,
  "forecast_type": "daily"
}
```

### History Graph Card
```json
{
  "type": "history-graph",
  "entities": [
    "sensor.temperature",
    "sensor.humidity"
  ],
  "hours_to_show": 24
}
```

### Gauge Card
```json
{
  "type": "gauge",
  "entity": "sensor.cpu_usage",
  "min": 0,
  "max": 100,
  "severity": {
    "green": 0,
    "yellow": 60,
    "red": 85
  }
}
```

### Markdown Card
```json
{
  "type": "markdown",
  "content": "## Welcome Home\nThe temperature is {{ states('sensor.temperature') }}°C"
}
```

### Conditional Card
```json
{
  "type": "conditional",
  "conditions": [
    {"entity": "binary_sensor.motion", "state": "on"}
  ],
  "card": {
    "type": "entities",
    "entities": ["camera.front_door"]
  }
}
```

### Horizontal/Vertical Stack
```json
{
  "type": "horizontal-stack",
  "cards": [
    {"type": "button", "entity": "light.left"},
    {"type": "button", "entity": "light.right"}
  ]
}
```

### Area Card
```json
{
  "type": "area",
  "area": "living_room",
  "show_camera": true,
  "navigation_path": "/lovelace/living-room"
}
```

### Map Card
```json
{
  "type": "map",
  "entities": [
    "person.john",
    "zone.home"
  ],
  "hours_to_show": 24,
  "default_zoom": 14
}
```

### Energy Cards
```json
{
  "type": "energy-distribution",
  "link_dashboard": true
}
```

### Tile Card (Modern)
```json
{
  "type": "tile",
  "entity": "light.living_room",
  "name": "Living Room",
  "icon": "mdi:lamp",
  "features": [
    {"type": "light-brightness"}
  ]
}
```

### Sections View (Modern Layout)
```json
{
  "title": "Home",
  "type": "sections",
  "sections": [
    {
      "title": "Living Room",
      "cards": [
        {"type": "tile", "entity": "light.living_room"},
        {"type": "tile", "entity": "climate.living_room"}
      ]
    }
  ]
}
```

## Dashboard Design Best Practices

1. **Use Sections view** for modern layouts — auto-responsive, cleaner
2. **Group by area/function** — Living Room section, Climate section, etc.
3. **Tile cards** for most entities — modern look, consistent sizing
4. **Use `navigation_path`** on cards to link between views
5. **Conditional cards** to show cameras only when motion detected
6. **Keep views focused** — Overview + per-area/function views
7. **Badges** for key status indicators at top of view
8. **Test on a new dashboard first** — Don't modify the default dashboard blindly

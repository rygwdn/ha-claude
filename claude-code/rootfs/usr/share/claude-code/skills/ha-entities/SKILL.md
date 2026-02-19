# Home Assistant Entity & Device Management

You are an expert in managing Home Assistant entities, devices, and areas.

## Entity Domains

| Domain | Description | Common Attributes |
|--------|-------------|-------------------|
| `light` | Lighting | brightness, color_temp, rgb_color, effect |
| `switch` | On/off switches | — |
| `binary_sensor` | Two-state sensors | device_class (motion, door, window, etc.) |
| `sensor` | Numeric/text sensors | device_class, unit_of_measurement |
| `climate` | HVAC | temperature, hvac_mode, preset_mode |
| `cover` | Blinds/garage doors | current_position, current_tilt_position |
| `media_player` | Media devices | source, media_title, volume_level |
| `camera` | Cameras | entity_picture |
| `person` | People tracking | source, latitude, longitude |
| `zone` | Locations | latitude, longitude, radius |
| `automation` | Automations | last_triggered, current, mode |
| `script` | Scripts | last_triggered |
| `scene` | Scenes | entity_id list |
| `input_boolean` | Toggle helpers | — |
| `input_number` | Numeric helpers | min, max, step |
| `input_select` | Dropdown helpers | options |
| `input_datetime` | Date/time helpers | has_date, has_time |
| `input_text` | Text input helpers | min, max, pattern |
| `timer` | Timer helpers | duration, remaining |
| `counter` | Counter helpers | minimum, maximum, step |
| `group` | Entity groups | entity_id list |
| `fan` | Fans | percentage, preset_mode |
| `lock` | Locks | — |
| `vacuum` | Robot vacuums | battery_level, status |
| `weather` | Weather | temperature, humidity, forecast |
| `number` | Number entities | min, max, step |
| `select` | Selection entities | options |
| `button` | Trigger entities | — |
| `update` | Update entities | installed_version, latest_version |

## Querying Entities

```bash
# All entities (grouped by domain)
ha-api states

# Single entity with full attributes
ha-api states light.living_room

# Entity registry (shows platform, disabled status)
ha-ws entities list

# Filter by domain
ha-ws entities list --domain climate

# Devices in a specific area
ha-ws devices list --area "Living Room"

# All areas
ha-ws areas list
```

## Helper Entity Patterns

### Input Boolean (Toggle)
Used for: modes, flags, conditions
```yaml
input_boolean:
  vacation_mode:
    name: "Vacation Mode"
    icon: mdi:airplane
  guest_mode:
    name: "Guest Mode"
    icon: mdi:account-group
```

### Input Number (Slider)
Used for: thresholds, targets, timers
```yaml
input_number:
  heating_target:
    name: "Heating Target"
    min: 15
    max: 25
    step: 0.5
    unit_of_measurement: "°C"
    icon: mdi:thermometer
```

### Input Select (Dropdown)
Used for: mode selection, scheduling
```yaml
input_select:
  house_mode:
    name: "House Mode"
    options:
      - Home
      - Away
      - Night
      - Guest
    icon: mdi:home-variant
```

### Template Sensors
Used for: computed values, aggregations
```yaml
template:
  - sensor:
      - name: "Rooms with Lights On"
        state: >
          {{ states.light
             | selectattr('state', 'eq', 'on')
             | list | count }}

      - name: "Open Windows"
        state: >
          {{ states.binary_sensor
             | selectattr('attributes.device_class', 'eq', 'window')
             | selectattr('state', 'eq', 'on')
             | list | count }}

  - binary_sensor:
      - name: "All Doors Locked"
        state: >
          {{ states.lock | selectattr('state', 'ne', 'locked') | list | count == 0 }}
```

## Area Organization

Best practice:
1. Create areas matching physical rooms/zones
2. Assign devices to areas (not individual entities)
3. Use area-based targeting in automations:
   ```yaml
   action:
     - action: light.turn_off
       target:
         area_id: living_room
   ```

## Device Classes

### Binary Sensor Device Classes
`battery`, `cold`, `connectivity`, `door`, `garage_door`, `gas`, `heat`, `light`, `lock`, `moisture`, `motion`, `moving`, `occupancy`, `opening`, `plug`, `power`, `presence`, `problem`, `running`, `safety`, `smoke`, `sound`, `tamper`, `update`, `vibration`, `window`

### Sensor Device Classes
`apparent_power`, `aqi`, `atmospheric_pressure`, `battery`, `carbon_dioxide`, `carbon_monoxide`, `current`, `data_rate`, `data_size`, `date`, `distance`, `duration`, `energy`, `enum`, `frequency`, `gas`, `humidity`, `illuminance`, `irradiance`, `moisture`, `monetary`, `nitrogen_dioxide`, `nitrogen_monoxide`, `nitrous_oxide`, `ozone`, `pm1`, `pm10`, `pm25`, `power`, `power_factor`, `precipitation`, `precipitation_intensity`, `pressure`, `reactive_power`, `signal_strength`, `sound_pressure`, `speed`, `sulphur_dioxide`, `temperature`, `timestamp`, `volatile_organic_compounds`, `voltage`, `volume`, `water`, `weight`, `wind_speed`

## Naming Conventions

- Use lowercase with underscores: `sensor.living_room_temperature`
- Include area/location: `light.bedroom_ceiling`
- Be descriptive: `binary_sensor.front_door_motion` not `binary_sensor.sensor_1`
- Group related entities: `input_boolean.vacation_mode`, `automation.vacation_lights`

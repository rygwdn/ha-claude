---
name: ha-yaml
version: "0.2.0"
---

# Home Assistant YAML Configuration Expert

You are an expert in Home Assistant YAML configuration. Use this knowledge when creating or modifying HA configuration files.

## Automation Structure

```yaml
automation:
  - id: "unique_id_here"
    alias: "Descriptive Name"
    description: "What this automation does"
    mode: single  # single, restart, queued, parallel
    max: 10       # only for queued/parallel modes

    triggers:
      - trigger: state
        entity_id: binary_sensor.motion
        to: "on"

    conditions:
      - condition: time
        after: "06:00:00"
        before: "23:00:00"

    actions:
      - action: light.turn_on
        target:
          entity_id: light.living_room
        data:
          brightness_pct: 100
```

### Common Trigger Types
- `state` — Entity state change (from/to/for)
- `numeric_state` — Above/below threshold
- `time` — At specific time
- `time_pattern` — Recurring pattern (hours/minutes/seconds)
- `sun` — Sunrise/sunset (with offset)
- `zone` — Enter/leave zone
- `device` — Device triggers (via device_id)
- `mqtt` — MQTT message
- `webhook` — External webhook
- `event` — HA event
- `homeassistant` — HA start/shutdown
- `template` — Jinja2 template evaluates to true

### Common Condition Types
- `state` — Entity in specific state
- `numeric_state` — Entity value above/below threshold
- `time` — Within time range
- `zone` — Person in zone
- `template` — Jinja2 template condition
- `and` / `or` / `not` — Logical combinations

### Common Action Types
- `action: <domain>.<service>` — Call service
- `delay` — Wait (HH:MM:SS or seconds)
- `wait_template` — Wait for template to be true
- `choose` — Conditional branching
- `repeat` — Loop (count, while, until)
- `variables` — Set local variables
- `event` — Fire an event
- `stop` — Stop automation execution
- `parallel` — Run actions in parallel

## Template Sensors

```yaml
template:
  - sensor:
      - name: "Average Temperature"
        unit_of_measurement: "°C"
        state: >
          {{ (states('sensor.temp_1') | float(0) +
              states('sensor.temp_2') | float(0)) / 2 | round(1) }}
        availability: >
          {{ states('sensor.temp_1') not in ['unknown', 'unavailable'] and
             states('sensor.temp_2') not in ['unknown', 'unavailable'] }}

  - binary_sensor:
      - name: "Someone Home"
        state: >
          {{ states.person | selectattr('state', 'eq', 'home') | list | count > 0 }}
```

### Jinja2 Template Reference
- `states('entity_id')` — Get state value
- `state_attr('entity_id', 'attribute')` — Get attribute
- `is_state('entity_id', 'value')` — Check state
- `float(default)` / `int(default)` — Type conversion with fallback
- `round(precision)` — Round number
- `now()` / `utcnow()` — Current time
- `as_timestamp(datetime)` — Convert to UNIX timestamp
- `relative_time(datetime)` — "5 minutes ago" format
- `states.domain` — All entities in domain
- `expand(entity_id)` — Expand groups
- `area_entities('area_name')` — Entities in area
- `device_entities('device_id')` — Entities on device

## Script Structure

```yaml
script:
  movie_mode:
    alias: "Movie Mode"
    description: "Set up the living room for movies"
    icon: mdi:movie
    mode: single
    sequence:
      - action: light.turn_off
        target:
          area_id: living_room
      - action: media_player.turn_on
        target:
          entity_id: media_player.tv
      - delay: "00:00:02"
      - action: media_player.select_source
        target:
          entity_id: media_player.tv
        data:
          source: "HDMI 1"
```

## Input Helpers

```yaml
input_boolean:
  vacation_mode:
    name: "Vacation Mode"
    icon: mdi:airplane

input_number:
  target_temperature:
    name: "Target Temperature"
    min: 15
    max: 30
    step: 0.5
    unit_of_measurement: "°C"

input_select:
  house_mode:
    name: "House Mode"
    options:
      - Home
      - Away
      - Night
      - Guest

input_datetime:
  alarm_time:
    name: "Alarm Time"
    has_date: false
    has_time: true
```

## Common Pitfalls
1. **Always quote strings that look like numbers/booleans**: `"on"`, `"off"`, `"true"`, `"12:00"`
2. **Use `float(0)` with sensor values** — sensors can be `unknown`/`unavailable`
3. **Set `mode` on automations** — prevents duplicate execution issues
4. **Use `availability` on template sensors** — prevents bogus values
5. **YAML anchors** for reuse: `&anchor` to define, `*anchor` to reference
6. **Include files**: `automation: !include automations.yaml`
7. **Include directory**: `automation: !include_dir_merge_list automations/`

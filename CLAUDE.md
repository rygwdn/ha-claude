# ha-claude

Home Assistant add-on that provides a web UI for Claude Code with HA-specific CLI tools and skills.

## Repository structure

```
claude-code/           # The HA add-on
  config.yaml          # Add-on config: version, options, schema, arch
  build.yaml           # Docker build config: base images, labels, build args
  Dockerfile           # Multi-stage build (cli-tools → server → Alpine final)
  CHANGELOG.md         # Release history — update whenever version is bumped
  DOCS.md              # User-facing documentation
  apparmor.txt         # AppArmor security profile
  translations/        # Localization strings
  cli-tools/           # TypeScript CLI tools compiled into the image
    src/               # ha-api.ts, ha-ws.ts, ha-backup.ts, ha-check.ts, ha-browse.ts
  server/              # TypeScript ingress proxy (routes HA traffic → claudecodeui)
    src/               # index.ts, ha-proxy.ts, routes/
  rootfs/              # Overlay onto the container filesystem
    etc/cont-init.d/   # S6 init scripts (run once at startup)
    etc/services.d/    # S6 service definitions (claudecodeui, proxy)
    usr/local/bin/     # Shell wrapper scripts for CLI tools
    usr/share/claude-code/
      CLAUDE.md.tmpl   # Deployed to /homeassistant/CLAUDE.md on first run
      skills/          # Claude Code skills (ha-api, ha-dashboard, ha-diagnose, etc.)
repository.yaml        # HA add-on repository metadata
.github/workflows/
  lint.yaml            # HA add-on linter (runs on PRs to main)
  builder.yaml         # Docker build CI (triggers when monitored files change on main)
  docker-build.yaml    # Additional Docker build checks
```

## Development

Build the TypeScript packages locally:
```bash
cd claude-code/cli-tools && npm ci && npm run build
cd claude-code/server && npm ci && npm run build
```

Build the Docker image:
```bash
docker build claude-code/ \
  --build-arg BUILD_FROM=ghcr.io/home-assistant/amd64-base:3.21 \
  --build-arg BUILD_ARCH=amd64 \
  --build-arg TEMPIO_VERSION=2024.11.2
```

## Conventions

- **Version** lives in `claude-code/config.yaml`. Always update `claude-code/CHANGELOG.md` when bumping.
- The `rootfs/` directory is copied verbatim into the container (`COPY rootfs /`), so its internal paths must match where files should land in the image.
- S6-overlay handles process supervision: `cont-init.d/` scripts run once at startup, `services.d/` scripts define long-running services.
- CLI tools are TypeScript compiled to `dist/` (gitignored). `npm run build` must succeed before Docker build.
- The builder CI only triggers on pushes to `main` when files in `build.yaml config.yaml Dockerfile rootfs` change.
- Add-on linting uses `frenck/action-addon-linter` and validates `config.yaml` against the HA add-on schema — `ingress_port: 0` is invalid, for example.

# Stage 1: Build CLI tools
FROM node:22-alpine AS cli-builder
WORKDIR /build/cli-tools
COPY cli-tools/package.json cli-tools/tsconfig.json ./
RUN npm ci
COPY cli-tools/src ./src
RUN npm run build

# Stage 2: Build frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /build/frontend
COPY frontend/package.json frontend/tsconfig.json frontend/vite.config.ts ./
RUN npm ci
COPY frontend/index.html ./
COPY frontend/src ./src
RUN npm run build

# Stage 3: Build backend
FROM node:22-alpine AS backend-builder
WORKDIR /build/server
COPY server/package.json server/tsconfig.json ./
RUN npm ci
COPY server/src ./src
RUN npm run build && npm prune --production

# Stage 4: Final image
ARG BUILD_FROM
FROM $BUILD_FROM

# Install system dependencies
RUN apk add --no-cache \
    nodejs \
    npm \
    git \
    python3 \
    make \
    g++ \
    bash \
    curl \
    openssh-client

# Install Claude Code CLI globally
RUN npm install -g @anthropic-ai/claude-code

# Install tempio for template rendering
ARG TEMPIO_VERSION BUILD_ARCH
RUN curl -sSLf -o /usr/bin/tempio \
    "https://github.com/home-assistant/tempio/releases/download/${TEMPIO_VERSION}/tempio_${BUILD_ARCH}"

# Copy CLI tools (built JS)
COPY --from=cli-builder /build/cli-tools/dist /opt/cli-tools/dist
COPY --from=cli-builder /build/cli-tools/node_modules /opt/cli-tools/node_modules
COPY --from=cli-builder /build/cli-tools/package.json /opt/cli-tools/package.json

# Copy frontend (built static files) into server public dir
COPY --from=frontend-builder /build/frontend/dist /opt/server/public

# Copy backend (built JS + production node_modules)
COPY --from=backend-builder /build/server/dist /opt/server/dist
COPY --from=backend-builder /build/server/node_modules /opt/server/node_modules
COPY --from=backend-builder /build/server/package.json /opt/server/package.json

# Rebuild node-pty for target architecture
WORKDIR /opt/server
RUN npm rebuild node-pty

# Copy rootfs overlay (S6 scripts, CLI wrappers, skills, templates)
COPY rootfs /

# Set permissions
RUN chmod a+x /usr/local/bin/ha-api \
    && chmod a+x /usr/local/bin/ha-ws \
    && chmod a+x /usr/local/bin/ha-backup \
    && chmod a+x /usr/local/bin/ha-check \
    && chmod a+x /etc/services.d/backend/run \
    && chmod a+x /etc/services.d/backend/finish \
    && chmod a+x /etc/cont-init.d/01-init-config.sh

# Create required directories
RUN mkdir -p /data/sessions /root/.claude

WORKDIR /homeassistant

# Build labels
ARG BUILD_DATE
ARG BUILD_REF
ARG BUILD_VERSION
LABEL \
    io.hass.name="Claude Code" \
    io.hass.description="AI coding assistant with deep Home Assistant integration" \
    io.hass.arch="${BUILD_ARCH}" \
    io.hass.type="addon" \
    io.hass.version=${BUILD_VERSION}

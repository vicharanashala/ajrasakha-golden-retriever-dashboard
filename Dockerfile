# Stage 1: Build the client
FROM node:20-alpine AS client-builder

WORKDIR /app/client

# Copy package files first
COPY client/package.json .

# Install client dependencies using npm install (no package-lock in subdir)
RUN npm install

# Copy client source
COPY client/ ./

# Build client
RUN npm run build

# Stage 2: Build the server
FROM node:20-alpine AS server-builder

WORKDIR /app/server

# Copy package files first
COPY server/package.json .

# Install server dependencies using npm install (no package-lock in subdir)
RUN npm install

# Copy server source
COPY server/ ./

# Build TypeScript
RUN npm run build

# Stage 3: Production stage with Tailscale + s6-overlay
FROM node:20-alpine AS production

WORKDIR /app

# Install Tailscale and curl (needed for s6-overlay)
RUN apk update && apk add tailscale curl

# Create essential runtime directories for the Tailscale daemon
RUN mkdir -p /var/run/tailscale /var/lib/tailscale /dev/net

# Install s6-overlay for process management
ARG S6_OVERLAY_VERSION=3.2.3.0
RUN curl -sL https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-noarch.tar.xz -o /tmp/s6-overlay-noarch.tar.xz && \
    tar -C / -Jxpf /tmp/s6-overlay-noarch.tar.xz && \
    curl -sL https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-x86_64.tar.xz -o /tmp/s6-overlay-x86_64.tar.xz && \
    tar -C / -Jxpf /tmp/s6-overlay-x86_64.tar.xz && \
    rm /tmp/s6-overlay-*.tar.xz

# Create s6 service directories
RUN mkdir -p /etc/services.d/tailscale /etc/services.d/node

# Copy built client from client-builder
COPY --from=client-builder /app/client/dist ./client/dist

# Copy built server from server-builder
COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/node_modules ./node_modules
COPY --from=server-builder /app/server/package.json ./

# Copy s6 service scripts
COPY s6-scripts/tailscale-run /etc/services.d/tailscale/run
COPY s6-scripts/node-run /etc/services.d/node/run

# Make scripts executable
RUN chmod +x /etc/services.d/tailscale/run /etc/services.d/node/run

# Create .env from example if it doesn't exist
COPY server/.env.example .env

# Set environment variables
ENV NODE_ENV=production
ENV CLIENT_ORIGIN=http://0.0.0.0:4000

# Expose port (match Cloud Run port)
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

# Use s6-overlay init binary as entrypoint
ENTRYPOINT ["/init"]
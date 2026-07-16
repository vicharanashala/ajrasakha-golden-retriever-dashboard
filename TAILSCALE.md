# Tailscale Integration

<!-- 
  This document describes the Tailscale mesh networking setup for ajrasakha-golden-retriever-dashboard.
  Last updated: 2026-07-16
  
  IMPORTANT: This documents the ACTUAL implementation, not theoretical config.
  If you change the entrypoint or s6-scripts, update this file too.
-->

This document describes how to configure and use Tailscale for mesh networking in the golden-retriever-dashboard container.

## Overview

The golden-retriever-dashboard container includes Tailscale for secure, low-latency mesh networking. This allows containers to communicate over Tailscale's encrypted network without exposing services to the public internet.

## Architecture

- **Single Container**: Tailscale runs in userspace networking mode inside the same container
- **Process Management**: s6-overlay manages both tailscaled and the Node.js application
- **SOCKS5 Proxy**: Node.js HTTP traffic can be routed through Tailscale's SOCKS5 proxy

## Setup

### 1. Generate a Tailscale Auth Key

1. Log in to your [Tailscale admin console](https://login.tailscale.com/admin/settings/keys)
2. Go to **Settings** > **Keys**
3. Click **Generate auth key**
4. For containers that can be recreated freely, enable **Ephemeral** (auto-cleanup)
5. Copy the generated key (format: `tskey-auth-...`)

### 2. Add the Secret to GitHub

Add `TAILSCALE_AUTHKEY` to your GitHub repository secrets:
1. Go to repository **Settings** > **Secrets and variables** > **Actions**
2. Add a new secret: `TAILSCALE_AUTHKEY` = `tskey-auth-your-key-here`

### 3. Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `TAILSCALE_AUTHKEY` | Tailscale auth key | `tskey-auth-...` |
| `TS_HOSTNAME` | Hostname on tailnet | `ajrasakha-staging` |
| `LANGGRAPH_SOCKS_URL` | SOCKS5 proxy URL for LangGraph traffic | `socks://127.0.0.1:1055` |

## How It Works

### 1. Container Startup (s6-overlay)

The container uses s6-overlay to manage multiple processes:

- **tailscaled service**: Starts the Tailscale daemon with userspace networking
- **node service**: Starts the Node.js application after Tailscale is connected

### 2. Tailscale Daemon

The `tailscaled` service:
1. Starts in userspace networking mode (`--tun=userspace-networking`)
2. Exposes a SOCKS5 proxy on port 1055
3. Authenticates using the auth key
4. Registers with the tailnet

### 3. Node.js Application

The Node.js application can use a custom fetch interceptor to route traffic through the Tailscale SOCKS5 proxy:

```typescript
import { SocksProxyAgent } from 'socks-proxy-agent';

const globalSocksAgent = new SocksProxyAgent('socks5://127.0.0.1:1055');
const originalFetch = globalThis.fetch;

globalThis.fetch = async (url: any, options: any = {}) => {
  // Route specific traffic through Tailscale SOCKS5 proxy
  if (url?.toString?.().includes('100.x.x.x')) {
    return originalFetch(url, { ...options, agent: globalSocksAgent });
  }
  // Let all other traffic go through normally
  return originalFetch(url, options);
};
```

## Verification

Check the container logs:

```bash
gcloud logs read --project=YOUR_PROJECT --filter="resource.type=cloud_run_revision"
```

Look for:
- Tailscale connection status
- The Tailscale IP address (100.x.x.x range)
- Connected peers

Alternatively, exec into the container (if running locally):

```bash
docker exec -it ajrasakha-golden-retriever sh
tailscale status
```

## Troubleshooting

### Container fails to start

Check if the auth key is valid and not expired. Generate a new key if needed.

### Tailscale not connecting

Verify:
1. Auth key is correct
2. Container has network access
3. Tailscale console shows the node

### App can't reach other services via Tailscale IP

Ensure:
1. The target service is reachable on the Tailscale network
2. The correct Tailscale IP is configured in the fetch interceptor
3. The SOCKS5 proxy is running on port 1055

## Security Notes

- Use **ephemeral auth keys** for containers that can be recreated freely
- The auth key is passed as an environment variable, so ensure it's stored as a GitHub secret
- Tailscale encrypts all traffic between nodes
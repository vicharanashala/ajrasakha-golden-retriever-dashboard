# Tailscale Integration

<!--
  This document describes the Tailscale mesh networking setup for ajrasakha-golden-retriever-dashboard.
  Last updated: 2026-07-20

  IMPORTANT: This documents the ACTUAL implementation, not theoretical config.
  If you change server/src/index.ts, server/src/services/retrieval.service.ts,
  or s6-scripts, update this file too.
-->

This document describes how to configure and use Tailscale for mesh networking in the golden-retriever-dashboard container.

## Overview

The golden-retriever-dashboard container includes Tailscale for secure, low-latency mesh networking. This allows containers to communicate over Tailscale's encrypted network without exposing services to the public internet.

## Architecture

- **Single Container**: Tailscale runs in userspace networking mode inside the same container
- **Process Management**: s6-overlay manages both tailscaled and the Node.js application
- **SOCKS5 Proxy**: Node.js HTTP traffic to the FastAPI retrieval service is routed through Tailscale's SOCKS5 proxy

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
| `RETRIEVAL_API_V1_URL` | FastAPI v1 endpoint reachable on the tailnet | `http://100.x.x.x:8110/v1/gdb/search` |
| `RETRIEVAL_API_V2_URL` | FastAPI v2 endpoint reachable on the tailnet | `http://100.x.x.x:8110/v2/gdb/search-combined` |
| `LANGGRAPH_SOCKS_URL` | SOCKS5 proxy URL exposed by `tailscaled` | `socks5://127.0.0.1:1055` |

## How It Works

### 1. Container Startup (s6-overlay)

The container uses s6-overlay to manage multiple processes:

- **tailscaled service**: Starts the Tailscale daemon with userspace networking
- **node service**: Starts the Express dashboard server after Tailscale is connected

### 2. Tailscale Daemon

The `tailscaled` service:
1. Starts in userspace networking mode (`--tun=userspace-networking`)
2. Exposes a SOCKS5 proxy on port 1055
3. Authenticates using the auth key
4. Registers with the tailnet

### 3. Express Server (SOCKS-aware retrieval)

The Express server routes upstream requests to the FastAPI retrieval service through the
Tailscale SOCKS5 proxy. See `server/src/services/retrieval.service.ts`:

```typescript
import { SocksProxyAgent } from 'socks-proxy-agent';
import * as nodeFetch from 'node-fetch';

let cachedSocksAgent: SocksProxyAgent | undefined;
const getSocksAgent = (): SocksProxyAgent | undefined => {
  if (!config.langgraphSocksUrl) return undefined;
  if (!cachedSocksAgent) {
    cachedSocksAgent = new SocksProxyAgent(config.langgraphSocksUrl);
  }
  return cachedSocksAgent;
};

// node-fetch is used (not native fetch) so the custom `agent` option is honored.
// Native fetch ignores the `agent` option entirely.
const fetchOptions = {
  method: 'POST',
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
  signal: AbortSignal.timeout(config.retrievalApiTimeoutMs),
  ...(socksAgent ? { agent: socksAgent } : {}),
};
const response = socksAgent
  ? await nodeFetch(endpoint, fetchOptions)
  : await fetch(endpoint, fetchOptions);
```

**Key Points:**
- When `LANGGRAPH_SOCKS_URL` is set (recommended in production), `node-fetch` is used with a `SocksProxyAgent` pointing at `tailscaled`'s local SOCKS5 proxy.
- When unset, the server falls back to native `fetch` (useful for local development without Tailscale).
- `RETRIEVAL_API_V1_URL` / `RETRIEVAL_API_V2_URL` must be reachable on the tailnet (e.g. `http://100.x.x.x:8110/...`), not `localhost`.

### 4. Startup self-test

Five seconds after `app.listen`, `server/src/index.ts` runs a single SOCKS5 GET
against `${RETRIEVAL_API_V1_URL}` with `/v1/...` stripped (so `/health` by
default). The result is logged as either:

```
[startup] SOCKS5 self-test SUCCESS (status=200)
[startup] SOCKS5 self-test body: ...
```

or, with the full underlying error (name, message, code, errno, syscall, stack):

```
[startup] SOCKS5 self-test FAILED
[startup]   error name: Error
[startup]   error message: ...
[startup]   error code: ECONNREFUSED
...
```

This is the first place to look when search requests return 502.

## Verification

Check the container logs for the lines described above. The relevant startup lines are:

```bash
gcloud logs read --project=YOUR_PROJECT --filter="resource.type=cloud_run_revision" | grep -E 'startup|retrieval|TAILSCALE'
```

Look for:
- `[startup] socks proxy: socks5://127.0.0.1:1055`
- `[startup] SOCKS5 self-test SUCCESS` (or `FAILED` with error details)
- `[retrieval] Old API request → http://100.x.x.x:8110/v1/gdb/search (socks=on)`

## Troubleshooting

### Searches return 502 "currently unreachable"

1. Confirm `LANGGRAPH_SOCKS_URL` is set to `socks5://127.0.0.1:1055` on the deployed instance.
2. Confirm `RETRIEVAL_API_V*_URL` points to a Tailscale IP (or a hostname that resolves on the tailnet), not `localhost`.
3. Check the `[startup] SOCKS5 self-test` line in the logs — its `error code` (e.g. `ECONNREFUSED`, `ETIMEDOUT`) tells you whether the issue is the proxy, the route, or the upstream service.

### Container fails to start

Check if the auth key is valid and not expired. Generate a new key if needed.

### Tailscale not connecting

Verify:
1. Auth key is correct
2. Container has network access
3. Tailscale console shows the node

## Security Notes

- Use **ephemeral auth keys** for containers that can be recreated freely
- The auth key is passed as an environment variable, so ensure it's stored as a GitHub secret
- Tailscale encrypts all traffic between nodes
- Only the FastAPI retrieval traffic is routed through Tailscale; other services use normal routing
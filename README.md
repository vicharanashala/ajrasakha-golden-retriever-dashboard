# Golden Retrieval Tester

Golden Retrieval Tester is a React dashboard for comparing Golden Database retrieval API versions. Agricultural experts can search by question, crop, and Indian state or Union Territory, inspect ranked matches, and compare old and new API responses side by side.

The React client calls a small Express proxy, which forwards requests to the FastAPI v1 and v2 routes. Response normalization and all retrieval-specific display logic remain in the client so the temporary proxy can be removed later with minimal changes.

## Features

- Old API, New API, and Comparison modes
- Side-by-side comparison on desktop and stacked comparison on smaller screens
- Selected answer shown before other retrieved questions
- Combined, relevance, and similarity scores for New API candidates
- Question-semantic, answer-semantic, keyword, and total candidate counters
- Per-question retrieval sources with multi-source deduplication
- Expandable answers, sources, classifications, and relevance reasons
- Complete state and Union Territory selector
- Independent v1 and v2 failure reporting
- Responsive interface

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- Tailscale access to the Golden Database FastAPI service

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the server environment example:

   ```bash
   cp server/.env.example server/.env
   ```

   On Windows PowerShell:

   ```powershell
   Copy-Item server/.env.example server/.env
   ```

3. Set the v1 and v2 FastAPI route URLs in `server/.env`.

4. Start the dashboard:

   ```bash
   npm run dev
   ```

The dashboard runs at `http://localhost:5173`; its Express proxy runs at `http://localhost:4000`.

## Environment variables

| Variable | Purpose | Example |
| --- | --- | --- |
| `PORT` | Express proxy port | `4000` |
| `CLIENT_ORIGIN` | Allowed browser origin | `http://localhost:5173` |
| `RETRIEVAL_API_V1_URL` | Old API search route | `http://localhost:8110/v1/gdb/search` |
| `RETRIEVAL_API_V2_URL` | New combined-search API route | `http://localhost:8110/v2/gdb/search-combined` |
| `RETRIEVAL_API_TIMEOUT_MS` | Upstream request timeout | `90000` |

Local `.env` files are ignored; only `.env.example` is tracked. Do not commit private Tailscale endpoints or credentials.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Express proxy and Vite development server |
| `npm run typecheck` | Type-check both workspaces |
| `npm test` | Run automated tests |
| `npm run build` | Build both workspaces |
| `npm start` | Start Express and serve the production client build |

## Project structure

```text
.
|-- client/               React and Vite application
|   `-- src/
|       |-- components/   Search and result UI
|       |-- services/     Proxy calls and response normalization
|       `-- utils/        Display formatting helpers
|-- server/               Temporary Express proxy
|   |-- .env.example      Public environment-variable template
|   `-- src/
|       |-- routes/       Version-aware proxy route
|       |-- services/     FastAPI request forwarding
|       `-- validation/   Request validation
|-- .github/workflows/    GitHub Actions verification
`-- package.json          Root commands for the client workspace
```

## Production

Run `npm run build`, set `NODE_ENV=production`, and run `npm start`. Express serves the generated `client/dist` application and proxies API requests.

For a future public deployment, the Express host must be able to reach FastAPI. Aryan can later expose FastAPI with appropriate HTTPS and CORS configuration and remove this proxy.

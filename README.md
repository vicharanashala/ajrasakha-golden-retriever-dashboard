# Golden Retrieval Tester

Golden Retrieval Tester is a React dashboard for comparing Golden Database retrieval API versions. Agricultural experts can search by question, crop, and Indian state or Union Territory, inspect ranked matches, and compare old and new API responses side by side.

The browser calls the FastAPI v1 and v2 routes directly. This repository does not contain a separate application server.

## Features

- Old API, New API, and Comparison modes
- Side-by-side comparison on desktop and stacked comparison on smaller screens
- Selected answer shown before other retrieved questions
- Expandable answers, sources, classifications, and relevance reasons
- Complete state and Union Territory selector
- Independent v1 and v2 failure reporting
- Responsive interface

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- Browser access to the Golden Database FastAPI service
- CORS configured on FastAPI to allow the dashboard origin

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the client environment example:

   ```bash
   cp client/.env.example client/.env.local
   ```

   On Windows PowerShell:

   ```powershell
   Copy-Item client/.env.example client/.env.local
   ```

3. Set the v1 and v2 FastAPI route URLs in `client/.env.local`.

4. Start the dashboard:

   ```bash
   npm run dev
   ```

The dashboard runs at `http://localhost:5173`.

## Environment variables

| Variable | Purpose | Example |
| --- | --- | --- |
| `VITE_RETRIEVAL_API_V1_URL` | Old API search route | `http://localhost:8110/v1/gdb/search` |
| `VITE_RETRIEVAL_API_V2_URL` | New API search route | `http://localhost:8110/v2/gdb/search` |
| `VITE_RETRIEVAL_API_TIMEOUT_MS` | Browser request timeout | `90000` |

Vite embeds these values in the browser build. Do not place passwords, API keys, or other secrets in `VITE_*` variables. Local `.env` files are ignored; only `.env.example` is tracked.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run typecheck` | Type-check the React application |
| `npm test` | Run automated tests |
| `npm run build` | Create the production build in `client/dist` |
| `npm start` | Preview the production build locally |

## Project structure

```text
.
|-- client/               React and Vite application
|   |-- .env.example      Public environment-variable template
|   `-- src/
|       |-- components/   Search and result UI
|       |-- services/     Direct FastAPI calls and response normalization
|       `-- utils/        Display formatting helpers
|-- .github/workflows/    GitHub Actions verification
`-- package.json          Root commands for the client workspace
```

## Production

Run `npm run build`, then deploy the static `client/dist` directory to a static host.

For a public HTTPS dashboard, the FastAPI service must also be publicly reachable over HTTPS and must allow the deployed dashboard origin through CORS. A browser will block mixed-content HTTP requests and cross-origin requests that the API has not authorized.

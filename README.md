# Golden Retrieval Tester

Golden Retrieval Tester is a local React and Express dashboard for comparing Golden Database retrieval API versions. Agricultural experts can search by question, crop, and Indian state or Union Territory, inspect ranked matches, and compare old and new API responses side by side.

Feedback controls are intentionally not included. Tester feedback is managed separately through Zoho Desk.

## Features

- Old API, New API, and Comparison modes
- Side-by-side comparison on desktop and stacked comparison on smaller screens
- Five ranked questions with similarity scores
- Expandable answers, sources, classifications, and relevance reasons
- Complete state and Union Territory selector
- Responsive interface

Until `RETRIEVAL_API_V2_URL` is configured, New API requests fall back to the v1 endpoint.

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- Access to the Golden Database retrieval API

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

3. Update `server/.env` with the API endpoints.

4. Start the dashboard:

   ```bash
   npm run dev
   ```

The web application runs at `http://localhost:5173` and the Express API at `http://localhost:4000`.

## Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `PORT` | Express server port | `4000` |
| `CLIENT_ORIGIN` | Allowed browser origin | `http://localhost:5173` |
| `RETRIEVAL_API_URL` | v1 Golden Database search endpoint | `http://localhost:8110/v1/gdb/search` |
| `RETRIEVAL_API_V2_URL` | v2 search endpoint; falls back to v1 when empty | Empty |
| `RETRIEVAL_API_TIMEOUT_MS` | Upstream request timeout | `90000` |

Never commit `server/.env`. It is ignored by Git; only `.env.example` should be tracked.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the client and server in development mode |
| `npm run typecheck` | Type-check both workspaces |
| `npm test` | Run automated tests |
| `npm run build` | Build the client and server |
| `npm start` | Serve the production build |

## Project structure

```text
.
|-- client/               React and Vite application
|   `-- src/
|       |-- components/
|       |-- services/
|       `-- utils/
|-- server/               Express API proxy
|   `-- src/
|       |-- routes/
|       |-- services/
|       |-- types/
|       `-- validation/
|-- .github/workflows/    GitHub Actions verification
`-- package.json          Workspace scripts
```

## Production

Build both workspaces and start the Express server:

```bash
npm run build
npm start
```

Set `NODE_ENV=production` in the deployment environment. Express will serve the generated client build.

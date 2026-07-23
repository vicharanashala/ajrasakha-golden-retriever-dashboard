# Golden Retrieval Tester

Golden Retrieval Tester is a React dashboard for comparing Golden Database retrieval API versions and testing the Answer Shortener API. Agricultural experts can search by question, crop, and Indian state or Union Territory, inspect ranked matches, and compare old and new API responses side by side.

The React client calls a small Express proxy, which forwards requests to the FastAPI v1 and v2 routes. Response normalization and all retrieval-specific display logic remain in the client so the temporary proxy can be removed later with minimal changes.

## Features

- Old API, New API, and Comparison modes
- Side-by-side comparison on desktop and stacked comparison on smaller screens
- Selected answer shown before other retrieved questions
- Similarity score and retrieval source display for retrieved candidates
- Per-question retrieval sources with multi-source deduplication
- Expandable answers, sources, classifications, and relevance reasons
- Tester login gate for capturing evaluator name
- Retrieval and Answer Shortener feedback stored in separate Google Spreadsheet tabs
- Complete state and Union Territory selector
- Independent v1 and v2 failure reporting
- Answer Shortener API test page with full/short answer, character counts, and tolerance review
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

3. Set the v1 and v2 retrieval FastAPI route URLs in `server/.env`. The Answer Shortener URL defaults to `http://100.100.108.43:8112/v1/answers/shorten`; if its `X-API-Key` protection is enabled, set `ANSWER_SHORTENER_API_KEY` too.

4. If feedback logging is required, configure the Zoho Sheet variables in `server/.env` and create the Answer Shortener worksheet described below.

5. Optionally set a shared dashboard password for local builds in `client/.env.local`:

   ```bash
   VITE_DASHBOARD_PASSWORD=your-shared-password
   ```

   If this is not set, the development fallback password is `golden-tester`.

6. Start the dashboard:

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
| `ANSWER_SHORTENER_API_URL` | Answer Shortener v1 route | `http://100.100.108.43:8112/v1/answers/shorten` |
| `ANSWER_SHORTENER_API_KEY` | Optional `X-API-Key` for the Answer Shortener API |  |
| `ZOHO_ACCOUNTS_URL` | Zoho Accounts domain for the OAuth token exchange | `https://accounts.zoho.in` |
| `ZOHO_SHEET_API_BASE` | Zoho Sheet API domain | `https://sheet.zoho.in` |
| `ZOHO_CLIENT_ID` | Zoho OAuth client ID |  |
| `ZOHO_CLIENT_SECRET` | Zoho OAuth client secret |  |
| `ZOHO_REFRESH_TOKEN` | Zoho OAuth refresh token |  |
| `ZOHO_SHEET_RESOURCE_ID` | Existing Zoho workbook resource ID |  |
| `ZOHO_RETRIEVAL_WORKSHEET_NAME` | Retrieval feedback worksheet | `Feedback` |
| `ZOHO_ANSWER_SHORTENER_WORKSHEET_NAME` | Answer Shortener feedback worksheet | `Answer Shortener Feedback` |

Client-side optional variable:

| Variable | Purpose | Example |
| --- | --- | --- |
| `VITE_DASHBOARD_PASSWORD` | Shared dashboard password used by the lightweight login gate | `change-me` |


## Zoho Sheet feedback setup

Use the existing Zoho workbook identified by `ZOHO_SHEET_RESOURCE_ID`. Keep the existing `Feedback` worksheet for retrieval feedback, then create a second worksheet named `Answer Shortener Feedback` (or set `ZOHO_ANSWER_SHORTENER_WORKSHEET_NAME` to the name you choose). Put the exact column headers below in row 1. The application adds records by matching these header names.

The OAuth refresh token must have `ZohoSheet.dataAPI.READ` and `ZohoSheet.dataAPI.UPDATE` scopes. Zoho credentials remain only on the Express server and are never exposed in the browser.

### Retrieval feedback headers

```text
timestamp
tester_name
input_question
state
crop
retrieved_question_api_v1
retrieved_question_api_v2
retrieved_answer_with_sources_v1
retrieved_answer_with_sources_v2
question_id_v1
question_id_v2
similarity_score
retrieval_source
all_other_fetched_questions_v1
all_other_fetched_questions_v2
issue_faced
```

### Answer Shortener feedback headers

```text
timestamp
tester_name
original_query
expected_number_of_characters
full_answer
short_answer
original_character_count
expected_character_count
min_character_count
max_character_count
actual_character_count
footer_character_count
tolerance
issue_faced
```

Feedback is submitted through `POST /api/feedback` for retrieval and `POST /api/answer-shortener-feedback` for Answer Shortener. The existing download buttons call the matching `/download` endpoint and return that worksheet as a CSV file.

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
|       |-- routes/       Search proxy and feedback routes
|       |-- services/     FastAPI forwarding and Zoho Sheet logging
|       `-- validation/   Search and feedback request validation
|-- .github/workflows/    GitHub Actions verification
`-- package.json          Root commands for the client workspace
```

## Production

Run `npm run build`, set `NODE_ENV=production`, and run `npm start`. Express serves the generated `client/dist` application and proxies API requests.

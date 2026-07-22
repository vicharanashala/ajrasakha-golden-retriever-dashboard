import 'dotenv/config';

const numberFromEnv = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

// Most hosting providers store multi-line secrets with literal `\n` sequences.
// GoogleAuth needs real line breaks in the PEM private key.
const privateKeyFromEnv = (value: string | undefined) =>
  (value ?? '').replace(/\\n/g, '\n');

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: numberFromEnv(process.env.PORT, 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  retrievalApiV1Url:
    process.env.RETRIEVAL_API_V1_URL ??
    'http://localhost:8110/v1/gdb/search',
  retrievalApiV2Url:
    process.env.RETRIEVAL_API_V2_URL ??
    'http://localhost:8110/v2/gdb/search-combined',
  retrievalApiTimeoutMs: numberFromEnv(
    process.env.RETRIEVAL_API_TIMEOUT_MS,
    90_000,
  ),
  // SOCKS5 proxy exposed by tailscaled (default 127.0.0.1:1055). Empty/unset
  // disables the proxy and falls back to direct fetch.
  langgraphSocksUrl: process.env.LANGGRAPH_SOCKS_URL ?? '',
  answerShortenerApiUrl:
    process.env.ANSWER_SHORTENER_API_URL ??
    'http://100.100.108.43:8112/v1/answers/shorten',
  answerShortenerApiKey: process.env.ANSWER_SHORTENER_API_KEY ?? '',
  googleSheets: {
    serviceAccount: {
      projectId: process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID ?? '',
      clientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL ?? '',
      privateKey: privateKeyFromEnv(
        process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
      ),
    },
    // Retained as an optional local-development fallback. Production should use
    // the service-account variables above so no key file needs to be deployed.
    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS ?? '',
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID ?? '',
    retrievalWorksheetName:
      process.env.GOOGLE_RETRIEVAL_WORKSHEET_NAME ?? '',
    answerShortenerWorksheetName:
      process.env.GOOGLE_ANSWER_SHORTENER_WORKSHEET_NAME ?? '',
  },
  zoho: {
    accountsUrl: process.env.ZOHO_ACCOUNTS_URL ?? 'https://accounts.zoho.com',
    sheetApiBase: process.env.ZOHO_SHEET_API_BASE ?? 'https://sheet.zoho.com',
    clientId: process.env.ZOHO_CLIENT_ID ?? '',
    clientSecret: process.env.ZOHO_CLIENT_SECRET ?? '',
    refreshToken: process.env.ZOHO_REFRESH_TOKEN ?? '',
    sheetResourceId: process.env.ZOHO_SHEET_RESOURCE_ID ?? '',
    worksheetName: process.env.ZOHO_SHEET_WORKSHEET_NAME ?? '',
  },
};

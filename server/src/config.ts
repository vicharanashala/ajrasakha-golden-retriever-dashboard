import 'dotenv/config';

const numberFromEnv = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const retrievalApiV1Url =
  process.env.RETRIEVAL_API_URL ??
  'http://localhost:8110/v1/gdb/search';

const retrievalApiV2Url =
  process.env.RETRIEVAL_API_V2_URL?.trim() || retrievalApiV1Url;

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: numberFromEnv(process.env.PORT, 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  retrievalApiV1Url,
  retrievalApiV2Url,
  retrievalApiTimeoutMs: numberFromEnv(
    process.env.RETRIEVAL_API_TIMEOUT_MS,
    90_000,
  ),
};

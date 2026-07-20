import { SocksProxyAgent } from 'socks-proxy-agent';
import nodeFetch from 'node-fetch';
import { config } from '../config.js';
import type {
  ApiVersion,
  SearchRequest,
  UpstreamSearchResponse,
} from '../types/retrieval.js';

export class RetrievalServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'RetrievalServiceError';
  }
}

// Shared SOCKS5 agent (lazy-initialised). tailscaled exposes this on
// localhost; traffic to the FastAPI service (which lives on the tailnet)
// is routed through it.
let cachedSocksAgent: SocksProxyAgent | undefined;
const getSocksAgent = (): SocksProxyAgent | undefined => {
  if (!config.langgraphSocksUrl) return undefined;
  if (!cachedSocksAgent) {
    cachedSocksAgent = new SocksProxyAgent(config.langgraphSocksUrl);
  }
  return cachedSocksAgent;
};

const describeError = (error: unknown): string => {
  if (!(error instanceof Error)) return String(error);
  const err = error as Error & {
    code?: string;
    errno?: string | number;
    syscall?: string;
  };
  const parts = [
    `name=${err.name}`,
    `message=${err.message}`,
    err.code ? `code=${err.code}` : null,
    err.errno !== undefined ? `errno=${err.errno}` : null,
    err.syscall ? `syscall=${err.syscall}` : null,
  ].filter(Boolean);
  return parts.join(' ');
};

export const searchGoldenDatabase = async (
  payload: SearchRequest,
  version: ApiVersion,
): Promise<UpstreamSearchResponse> => {
  const apiLabel = version === 'v2' ? 'New API' : 'Old API';
  const endpoint =
    version === 'v2' ? config.retrievalApiV2Url : config.retrievalApiV1Url;
  const socksAgent = getSocksAgent();
  const socksEnabled = Boolean(socksAgent);

  console.log(
    `[retrieval] ${apiLabel} request → ${endpoint} (socks=${socksEnabled ? 'on' : 'off'})`,
  );

  const fetchOptions = {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(config.retrievalApiTimeoutMs),
    ...(socksAgent ? { agent: socksAgent } : {}),
  };

  let response: Response;
  try {
    response = socksAgent
      ? await (nodeFetch as unknown as typeof fetch)(endpoint, fetchOptions as never)
      : await fetch(endpoint, fetchOptions);
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.warn(
        `[retrieval] ${apiLabel} timeout after ${config.retrievalApiTimeoutMs}ms (endpoint=${endpoint}, socks=${socksEnabled ? 'on' : 'off'})`,
      );
      throw new RetrievalServiceError(
        `${apiLabel} took too long to respond. Please try again.`,
        504,
      );
    }

    console.error(
      `[retrieval] ${apiLabel} fetch failed (endpoint=${endpoint}, socks=${socksEnabled ? 'on' : 'off'}): ${describeError(error)}`,
    );

    throw new RetrievalServiceError(
      `${apiLabel} is currently unreachable from the dashboard server.`,
      502,
      error instanceof Error ? error.message : undefined,
    );
  }

  const responseText = await response.text();
  let responseBody: unknown;

  try {
    responseBody = responseText ? JSON.parse(responseText) : {};
  } catch {
    throw new RetrievalServiceError(
      `${apiLabel} returned an unreadable response.`,
      502,
    );
  }

  if (!response.ok) {
    throw new RetrievalServiceError(
      response.status === 422
        ? `${apiLabel} rejected the supplied search fields.`
        : `${apiLabel} could not complete this search.`,
      response.status === 422 ? 422 : 502,
      responseBody,
    );
  }

  if (
    typeof responseBody !== 'object' ||
    responseBody === null ||
    Array.isArray(responseBody)
  ) {
    throw new RetrievalServiceError(
      `${apiLabel} returned an unexpected response.`,
      502,
    );
  }

  return responseBody as UpstreamSearchResponse;
};
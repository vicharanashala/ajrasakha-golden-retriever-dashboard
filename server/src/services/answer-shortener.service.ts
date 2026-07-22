import { SocksProxyAgent } from 'socks-proxy-agent';
import nodeFetch from 'node-fetch';
import { config } from '../config.js';

export class AnswerShortenerServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AnswerShortenerServiceError';
  }
}

// Shared SOCKS5 agent (lazy-initialised). tailscaled exposes this on
// localhost; traffic to the Answer Shortener service (which lives on the
// tailnet) is routed through it — same pattern as the retrieval service.
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

export const shortenAnswer = async (payload: object) => {
  const socksAgent = getSocksAgent();
  const socksEnabled = Boolean(socksAgent);

  console.log(
    `[answer-shortener] request → ${config.answerShortenerApiUrl} (socks=${socksEnabled ? 'on' : 'off'})`,
  );

  const fetchOptions = {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(config.answerShortenerApiKey
        ? { 'X-API-Key': config.answerShortenerApiKey }
        : {}),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(config.answerShortenerApiTimeoutMs),
    ...(socksAgent ? { agent: socksAgent } : {}),
  };

  let upstreamResponse: Response;
  try {
    upstreamResponse = socksAgent
      ? await (nodeFetch as unknown as typeof fetch)(
          config.answerShortenerApiUrl,
          fetchOptions as never,
        )
      : await fetch(config.answerShortenerApiUrl, fetchOptions);
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.warn(
        `[answer-shortener] timeout after ${config.answerShortenerApiTimeoutMs}ms (endpoint=${config.answerShortenerApiUrl}, socks=${socksEnabled ? 'on' : 'off'})`,
      );
      throw new AnswerShortenerServiceError(
        'Answer Shortener API took too long to respond. Please try again.',
        504,
      );
    }

    console.error(
      `[answer-shortener] fetch failed (endpoint=${config.answerShortenerApiUrl}, socks=${socksEnabled ? 'on' : 'off'}): ${describeError(error)}`,
    );

    throw new AnswerShortenerServiceError(
      'Answer Shortener API is currently unreachable from the dashboard server.',
      502,
      error instanceof Error ? error.message : undefined,
    );
  }

  const responseText = await upstreamResponse.text();
  let responseBody: unknown;

  try {
    responseBody = responseText ? JSON.parse(responseText) : {};
  } catch {
    throw new AnswerShortenerServiceError(
      'Answer Shortener API returned an unreadable response.',
      502,
    );
  }

  if (!upstreamResponse.ok) {
    throw new AnswerShortenerServiceError(
      upstreamResponse.status === 422
        ? 'Answer Shortener API rejected the supplied fields.'
        : 'Answer Shortener API could not shorten this answer.',
      upstreamResponse.status === 422 ? 422 : 502,
      responseBody,
    );
  }

  if (
    typeof responseBody !== 'object' ||
    responseBody === null ||
    Array.isArray(responseBody)
  ) {
    throw new AnswerShortenerServiceError(
      'Answer Shortener API returned an unexpected response.',
      502,
    );
  }

  return responseBody;
};

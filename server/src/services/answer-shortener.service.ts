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

export const shortenAnswer = async (payload: object) => {
  let upstreamResponse: Response;

  try {
    upstreamResponse = await fetch(config.answerShortenerApiUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(config.answerShortenerApiKey
          ? { 'X-API-Key': config.answerShortenerApiKey }
          : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(config.retrievalApiTimeoutMs),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new AnswerShortenerServiceError(
        'Answer Shortener API took too long to respond. Please try again.',
        504,
      );
    }

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

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

export const searchGoldenDatabase = async (
  payload: SearchRequest,
  version: ApiVersion,
): Promise<UpstreamSearchResponse> => {
  const apiLabel = version === 'v2' ? 'New API' : 'Old API';
  const endpoint =
    version === 'v2' ? config.retrievalApiV2Url : config.retrievalApiV1Url;
  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(config.retrievalApiTimeoutMs),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new RetrievalServiceError(
        `${apiLabel} took too long to respond. Please try again.`,
        504,
      );
    }

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

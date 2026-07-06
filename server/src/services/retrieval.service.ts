import { config } from '../config.js';
import type {
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

export type ApiVersion = 'v1' | 'v2';

export const searchGoldenDatabase = async (
  payload: SearchRequest,
  version: ApiVersion = 'v1',
): Promise<UpstreamSearchResponse> => {
  let response: Response;
  const retrievalApiUrl =
    version === 'v2' ? config.retrievalApiV2Url : config.retrievalApiV1Url;

  if (!retrievalApiUrl) {
    throw new RetrievalServiceError(
      `${version === 'v2' ? 'New' : 'Old'} API endpoint is not configured.`,
      503,
    );
  }

  try {
    response = await fetch(retrievalApiUrl, {
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
        'The retrieval service took too long to respond. Please try again.',
        504,
      );
    }
    throw new RetrievalServiceError(
      'The retrieval service is currently unreachable.',
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
      'The retrieval service returned an unreadable response.',
      502,
    );
  }

  if (!response.ok) {
    const isValidationError = response.status === 422;
    throw new RetrievalServiceError(
      isValidationError
        ? 'The retrieval service rejected the supplied search fields.'
        : 'The retrieval service could not complete this search.',
      isValidationError ? 422 : 502,
      responseBody,
    );
  }

  if (typeof responseBody !== 'object' || responseBody === null) {
    throw new RetrievalServiceError(
      'The retrieval service returned an unexpected response.',
      502,
    );
  }

  return responseBody as UpstreamSearchResponse;
};

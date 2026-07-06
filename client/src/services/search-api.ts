import type {
  ApiVersion,
  SearchPayload,
  SearchResponse,
} from '../types';
import { normalizeSearchResponse } from './normalize-response';

const API_URLS: Record<ApiVersion, string> = {
  v1: (import.meta.env.VITE_RETRIEVAL_API_V1_URL ?? '').trim(),
  v2: (import.meta.env.VITE_RETRIEVAL_API_V2_URL ?? '').trim(),
};

const parsedTimeout = Number(import.meta.env.VITE_RETRIEVAL_API_TIMEOUT_MS);
const API_TIMEOUT_MS =
  Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : 90_000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const extractFieldErrors = (body: unknown): Record<string, string[]> => {
  if (!isRecord(body) || !Array.isArray(body.detail)) return {};

  return body.detail.reduce<Record<string, string[]>>((errors, detail) => {
    if (!isRecord(detail) || !Array.isArray(detail.loc)) return errors;

    const field = [...detail.loc]
      .reverse()
      .find(
        (item): item is keyof SearchPayload =>
          item === 'rephrased_query' || item === 'crop' || item === 'state',
      );
    const message =
      typeof detail.msg === 'string' ? detail.msg : 'Invalid value.';

    if (field) errors[field] = [...(errors[field] ?? []), message];
    return errors;
  }, {});
};

export class SearchApiError extends Error {
  constructor(
    message: string,
    public readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = 'SearchApiError';
  }
}

export const submitSearch = async (
  payload: SearchPayload,
  version: ApiVersion = 'v1',
): Promise<SearchResponse> => {
  const apiLabel = version === 'v2' ? 'New API' : 'Old API';
  const endpoint = API_URLS[version];

  if (!endpoint) {
    throw new SearchApiError(`${apiLabel} endpoint is not configured.`);
  }

  let response: Response;
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(
    () => controller.abort(),
    API_TIMEOUT_MS,
  );
  const startedAt = performance.now();

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch {
    if (controller.signal.aborted) {
      throw new SearchApiError(
        `${apiLabel} took too long to respond. Please try again.`,
      );
    }

    throw new SearchApiError(
      `${apiLabel} is unreachable from the browser. Confirm network access and API CORS settings.`,
    );
  } finally {
    globalThis.clearTimeout(timeoutId);
  }

  const responseText = await response.text();
  let body: unknown = {};

  try {
    body = responseText ? JSON.parse(responseText) : {};
  } catch {
    throw new SearchApiError(`${apiLabel} returned an unreadable response.`);
  }

  if (!response.ok) {
    const fieldErrors = extractFieldErrors(body);
    throw new SearchApiError(
      response.status === 422
        ? `${apiLabel} rejected the supplied search fields.`
        : `${apiLabel} could not complete this search (HTTP ${response.status}).`,
      fieldErrors,
    );
  }

  if (!isRecord(body)) {
    throw new SearchApiError(`${apiLabel} returned an unexpected response.`);
  }

  const responseTimeMs = Math.round(performance.now() - startedAt);
  return normalizeSearchResponse(body, responseTimeMs);
};

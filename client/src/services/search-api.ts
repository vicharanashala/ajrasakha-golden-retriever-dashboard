import type {
  ApiVersion,
  SearchPayload,
  SearchResponse,
} from '../types';
import { normalizeSearchResponse } from './normalize-response';

const parsedTimeout = Number(import.meta.env.VITE_DASHBOARD_API_TIMEOUT_MS);
const API_TIMEOUT_MS =
  Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : 90_000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const extractFieldErrors = (body: unknown): Record<string, string[]> => {
  if (!isRecord(body)) return {};

  if (isRecord(body.fieldErrors)) {
    return Object.fromEntries(
      Object.entries(body.fieldErrors).filter(
        (entry): entry is [string, string[]] =>
          Array.isArray(entry[1]) &&
          entry[1].every((message) => typeof message === 'string'),
      ),
    );
  }

  if (!Array.isArray(body.detail)) return {};

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

const extractErrorMessage = (body: unknown): string | null =>
  isRecord(body) && typeof body.message === 'string' ? body.message : null;

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

  let response: Response;
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(
    () => controller.abort(),
    API_TIMEOUT_MS,
  );
  const startedAt = performance.now();

  try {
    response = await fetch(`/api/search?version=${version}`, {
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
      'The local dashboard server is unavailable. Confirm that it is running and try again.',
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
      extractErrorMessage(body) ??
        (response.status === 400 || response.status === 422
          ? `${apiLabel} rejected the supplied search fields.`
          : `${apiLabel} could not complete this search (HTTP ${response.status}).`),
      fieldErrors,
    );
  }

  if (!isRecord(body)) {
    throw new SearchApiError(`${apiLabel} returned an unexpected response.`);
  }

  const responseTimeMs = Math.round(performance.now() - startedAt);
  return normalizeSearchResponse(body, responseTimeMs);
};

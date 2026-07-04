import type {
  ApiErrorBody,
  ApiVersion,
  SearchPayload,
  SearchResponse,
} from '../types';

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
  let response: Response;

  try {
    response = await fetch(`/api/search?version=${version}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new SearchApiError(
      'The local dashboard server is unavailable. Confirm that it is running and try again.',
    );
  }

  const body = (await response.json().catch(() => ({}))) as ApiErrorBody;

  if (!response.ok) {
    throw new SearchApiError(
      body.message ?? 'The search could not be completed.',
      body.fieldErrors,
    );
  }

  return body as SearchResponse;
};

import type {
  AnswerShortenerPayload,
  AnswerShortenerResponse,
} from '../types';

const parsedTimeout = Number(import.meta.env.VITE_DASHBOARD_API_TIMEOUT_MS);
const API_TIMEOUT_MS =
  Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : 90_000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readString = (body: Record<string, unknown>, key: string) =>
  typeof body[key] === 'string' ? body[key] : null;

const readNumber = (body: Record<string, unknown>, key: string) =>
  typeof body[key] === 'number' && Number.isFinite(body[key]) ? body[key] : null;

const readBoolean = (body: Record<string, unknown>, key: string) =>
  typeof body[key] === 'boolean' ? body[key] : null;

const readMessage = (body: unknown) =>
  isRecord(body) && typeof body.message === 'string' ? body.message : null;

export class AnswerShortenerApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AnswerShortenerApiError';
  }
}

export const normalizeAnswerShortenerResponse = (
  body: unknown,
): AnswerShortenerResponse => {
  if (!isRecord(body)) {
    throw new AnswerShortenerApiError(
      'Answer Shortener API returned an unexpected response.',
    );
  }

  const shortAnswer = readString(body, 'short_answer');
  const fullAnswer = readString(body, 'full_answer');
  const originalCharacterCount = readNumber(body, 'original_character_count');
  const expectedCharacterCount = readNumber(body, 'expected_character_count');
  const minimumCharacterCount = readNumber(body, 'minimum_character_count');
  const maximumCharacterCount = readNumber(body, 'maximum_character_count');
  const actualCharacterCount = readNumber(body, 'actual_character_count');
  const footerCharacterCount = readNumber(body, 'footer_character_count');
  const tolerance = readNumber(body, 'tolerance');
  const withinTolerance = readBoolean(body, 'within_tolerance');

  if (
    shortAnswer === null ||
    fullAnswer === null ||
    originalCharacterCount === null ||
    expectedCharacterCount === null ||
    minimumCharacterCount === null ||
    maximumCharacterCount === null ||
    actualCharacterCount === null ||
    footerCharacterCount === null ||
    tolerance === null ||
    withinTolerance === null
  ) {
    throw new AnswerShortenerApiError(
      'Answer Shortener API response is missing one or more required fields.',
    );
  }

  return {
    shortAnswer,
    fullAnswer,
    originalCharacterCount,
    expectedCharacterCount,
    minimumCharacterCount,
    maximumCharacterCount,
    actualCharacterCount,
    footerCharacterCount,
    tolerance,
    withinTolerance,
  };
};

export const submitAnswerShortener = async (
  payload: AnswerShortenerPayload,
): Promise<AnswerShortenerResponse> => {
  if (payload.expectedCharacters === null) {
    throw new AnswerShortenerApiError('Enter the expected number of characters.');
  }

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(
    () => controller.abort(),
    API_TIMEOUT_MS,
  );
  let response: Response;

  try {
    response = await fetch('/api/answer-shortener', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        original_query: payload.originalQuery.trim(),
        answer: payload.originalAnswer.trim(),
        expected_character_count: payload.expectedCharacters,
      }),
      signal: controller.signal,
    });
  } catch {
    if (controller.signal.aborted) {
      throw new AnswerShortenerApiError(
        'Answer Shortener API took too long to respond. Please try again.',
      );
    }

    throw new AnswerShortenerApiError(
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
    throw new AnswerShortenerApiError(
      'Answer Shortener API returned an unreadable response.',
    );
  }

  if (!response.ok) {
    throw new AnswerShortenerApiError(
      readMessage(body) ??
        (response.status === 400 || response.status === 422
          ? 'Please check the supplied fields and try again.'
          : `Answer Shortener API could not complete this request (HTTP ${response.status}).`),
    );
  }

  return normalizeAnswerShortenerResponse(body);
};

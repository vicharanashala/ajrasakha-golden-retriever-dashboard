import type { AnswerShortenerPayload, AnswerShortenerResponse } from '../types';

export interface AnswerShortenerFeedbackSubmission {
  tester_name: string;
  original_query: string;
  expected_number_of_characters: number;
  full_answer: string;
  short_answer: string;
  original_character_count: number;
  expected_character_count: number;
  min_character_count: number;
  max_character_count: number;
  actual_character_count: number;
  footer_character_count: number;
  tolerance: number;
  issue_faced: string;
}

export class AnswerShortenerFeedbackApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AnswerShortenerFeedbackApiError';
  }
}

const extractMessage = (body: unknown) =>
  typeof body === 'object' &&
  body !== null &&
  'message' in body &&
  typeof body.message === 'string'
    ? body.message
    : null;

export const createAnswerShortenerFeedbackSubmission = (
  testerName: string,
  payload: AnswerShortenerPayload,
  result: AnswerShortenerResponse,
  issue: string,
): AnswerShortenerFeedbackSubmission => {
  if (payload.expectedCharacters === null) {
    throw new AnswerShortenerFeedbackApiError(
      'Expected number of characters is missing.',
    );
  }

  return {
    tester_name: testerName,
    original_query: payload.originalQuery.trim(),
    expected_number_of_characters: payload.expectedCharacters,
    full_answer: result.fullAnswer,
    short_answer: result.shortAnswer,
    original_character_count: result.originalCharacterCount,
    expected_character_count: result.expectedCharacterCount,
    min_character_count: result.minimumCharacterCount,
    max_character_count: result.maximumCharacterCount,
    actual_character_count: result.actualCharacterCount,
    footer_character_count: result.footerCharacterCount,
    tolerance: result.tolerance,
    issue_faced: issue.trim(),
  };
};

export const submitAnswerShortenerFeedback = async (
  payload: AnswerShortenerFeedbackSubmission,
) => {
  let response: Response;

  try {
    response = await fetch('/api/answer-shortener-feedback', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new AnswerShortenerFeedbackApiError(
      'The local dashboard server is unavailable. Please try again after confirming it is running.',
    );
  }

  const responseText = await response.text();
  let body: unknown = {};

  try {
    body = responseText ? JSON.parse(responseText) : {};
  } catch {
    throw new AnswerShortenerFeedbackApiError(
      'The feedback service returned an unreadable response.',
    );
  }

  if (!response.ok) {
    throw new AnswerShortenerFeedbackApiError(
      extractMessage(body) ??
        `Feedback could not be submitted (HTTP ${response.status}).`,
    );
  }
};

export interface FeedbackSubmission {
  tester_name: string;
  input_question: string;
  state: string;
  crop: string;
  retrieved_question_api_v1: string;
  retrieved_question_api_v2: string;
  retrieved_answer_with_sources_v1: string;
  retrieved_answer_with_sources_v2: string;
  question_id_v1: string;
  question_id_v2: string;
  similarity_score: string;
  retrieval_source: string;
  all_other_fetched_questions_v1: string;
  all_other_fetched_questions_v2: string;
  issue_faced: string;
}

export class FeedbackApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FeedbackApiError';
  }
}

const extractMessage = (body: unknown) => {
  if (
    typeof body === 'object' &&
    body !== null &&
    'message' in body &&
    typeof body.message === 'string'
  ) {
    return body.message;
  }

  return null;
};

export const submitFeedback = async (payload: FeedbackSubmission) => {
  let response: Response;

  try {
    response = await fetch('/api/feedback', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new FeedbackApiError(
      'The local dashboard server is unavailable. Please try again after confirming it is running.',
    );
  }

  const responseText = await response.text();
  let body: unknown = {};

  try {
    body = responseText ? JSON.parse(responseText) : {};
  } catch {
    throw new FeedbackApiError('The feedback service returned an unreadable response.');
  }

  if (!response.ok) {
    throw new FeedbackApiError(
      extractMessage(body) ??
        `Feedback could not be submitted (HTTP ${response.status}).`,
    );
  }

  return body;
};

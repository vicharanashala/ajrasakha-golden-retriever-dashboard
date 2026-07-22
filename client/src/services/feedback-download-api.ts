export class FeedbackDownloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FeedbackDownloadError';
  }
}

const extractMessage = (body: unknown) =>
  typeof body === 'object' &&
  body !== null &&
  'message' in body &&
  typeof body.message === 'string'
    ? body.message
    : null;

const getDownloadFilename = (contentDisposition: string | null) => {
  const match = contentDisposition?.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? 'feedback.csv';
};

export const downloadFeedbackCsv = async (
  endpoint: '/api/feedback/download' | '/api/answer-shortener-feedback/download',
  testerName: string,
) => {
  let response: Response;

  try {
    response = await fetch(
      `${endpoint}?tester_name=${encodeURIComponent(testerName)}`,
    );
  } catch {
    throw new FeedbackDownloadError(
      'The local dashboard server is unavailable. Please try again after confirming it is running.',
    );
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new FeedbackDownloadError(
      extractMessage(body) ??
        `Feedback could not be downloaded (HTTP ${response.status}).`,
    );
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = getDownloadFilename(
    response.headers.get('content-disposition'),
  );
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

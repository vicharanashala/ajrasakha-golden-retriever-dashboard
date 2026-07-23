import { config } from '../config.js';
import type { FeedbackRequest } from '../validation/feedback.schema.js';
import type { AnswerShortenerFeedbackRequest } from '../validation/answer-shortener-feedback.schema.js';

export class ZohoSheetError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 502,
  ) {
    super(message);
    this.name = 'ZohoSheetError';
  }
}

const requiredZohoConfig = () => {
  const missing = [
    ['ZOHO_CLIENT_ID', config.zoho.clientId],
    ['ZOHO_CLIENT_SECRET', config.zoho.clientSecret],
    ['ZOHO_REFRESH_TOKEN', config.zoho.refreshToken],
    ['ZOHO_SHEET_RESOURCE_ID', config.zoho.sheetResourceId],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new ZohoSheetError(
      `Zoho Sheet feedback is not configured. Missing: ${missing.join(', ')}.`,
      503,
    );
  }
};

const getIstTimestamp = () => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const valueFor = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${valueFor('year')}-${valueFor('month')}-${valueFor('day')} ${valueFor('hour')}:${valueFor('minute')}:${valueFor('second')} IST`;
};

const getZohoAccessToken = async () => {
  requiredZohoConfig();

  const body = new URLSearchParams({
    refresh_token: config.zoho.refreshToken,
    grant_type: 'refresh_token',
    client_id: config.zoho.clientId,
    client_secret: config.zoho.clientSecret,
  });

  const response = await fetch(`${config.zoho.accountsUrl}/oauth/v2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const responseBody = (await response.json().catch(() => ({}))) as {
    access_token?: unknown;
    error?: unknown;
  };

  if (!response.ok || typeof responseBody.access_token !== 'string') {
    throw new ZohoSheetError(
      typeof responseBody.error === 'string'
        ? `Zoho OAuth failed: ${responseBody.error}.`
        : 'Zoho OAuth failed while creating an access token.',
    );
  }

  return responseBody.access_token;
};

type ZohoResponse = {
  status?: unknown;
  error_code?: unknown;
  error_message?: unknown;
  message?: unknown;
  records?: unknown;
};

const callZohoSheet = async (
  accessToken: string,
  parameters: Record<string, string>,
) => {
  const body = new URLSearchParams({
    ...parameters,
  });

  const response = await fetch(
    `${config.zoho.sheetApiBase}/api/v2/${config.zoho.sheetResourceId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    },
  );

  const responseBody = (await response.json().catch(() => ({}))) as ZohoResponse;

  const hasZohoError =
    responseBody.status === 'failure' ||
    typeof responseBody.error_code === 'number' ||
    (typeof responseBody.error_message === 'string' &&
      responseBody.status !== 'success');

  if (!response.ok || hasZohoError) {
    const message =
      typeof responseBody.error_message === 'string'
        ? responseBody.error_message
        : typeof responseBody.message === 'string'
          ? responseBody.message
          : 'Zoho Sheet rejected the request.';

    throw new ZohoSheetError(message);
  }

  return responseBody;
};

type FeedbackRow = Record<string, string | number>;

const appendRow = async (worksheetName: string, row: FeedbackRow) => {
  const accessToken = await getZohoAccessToken();
  await callZohoSheet(accessToken, {
    method: 'worksheet.records.add',
    worksheet_name: worksheetName,
    header_row: '1',
    json_data: JSON.stringify([row]),
  });
};

const escapeCsvValue = (value: unknown) => {
  const text = String(value ?? '');
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
};

const createDownloadFilename = (prefix: string) => {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date())
    .replaceAll('/', '-');

  return `${prefix}-feedback-${date}.csv`;
};

const fetchRows = async (worksheetName: string) => {
  const accessToken = await getZohoAccessToken();
  const rows: Record<string, unknown>[] = [];
  const batchSize = 1_000;

  for (let recordsStartIndex = 1; ; recordsStartIndex += batchSize) {
    const response = await callZohoSheet(accessToken, {
      method: 'worksheet.records.fetch',
      worksheet_name: worksheetName,
      header_row: '1',
      records_start_index: String(recordsStartIndex),
      count: String(batchSize),
    });
    const batch = Array.isArray(response.records)
      ? response.records.filter(
          (record): record is Record<string, unknown> =>
            typeof record === 'object' && record !== null,
        )
      : [];

    rows.push(...batch);
    if (batch.length < batchSize) return rows;
  }
};

const downloadFeedback = async (
  worksheetName: string,
  headers: readonly string[],
  filenamePrefix: string,
) => {
  const rows = await fetchRows(worksheetName);
  const csvRows = [
    headers,
    ...rows.map((row) => headers.map((header) => row[header] ?? '')),
  ];

  return {
    filename: createDownloadFilename(filenamePrefix),
    csv: `${csvRows.map((row) => row.map(escapeCsvValue).join(',')).join('\r\n')}\r\n`,
  };
};

const retrievalHeaders = [
  'timestamp',
  'tester_name',
  'input_question',
  'state',
  'crop',
  'retrieved_question_api_v1',
  'retrieved_question_api_v2',
  'retrieved_answer_with_sources_v1',
  'retrieved_answer_with_sources_v2',
  'question_id_v1',
  'question_id_v2',
  'similarity_score',
  'retrieval_source',
  'all_other_fetched_questions_v1',
  'all_other_fetched_questions_v2',
  'issue_faced',
] as const;

const answerShortenerHeaders = [
  'timestamp',
  'tester_name',
  'original_query',
  'expected_number_of_characters',
  'full_answer',
  'short_answer',
  'original_character_count',
  'expected_character_count',
  'min_character_count',
  'max_character_count',
  'actual_character_count',
  'footer_character_count',
  'tolerance',
  'issue_faced',
] as const;

export const appendRetrievalFeedbackRow = async (feedback: FeedbackRequest) =>
  appendRow(config.zoho.retrievalWorksheetName, {
    timestamp: getIstTimestamp(),
    ...feedback,
  });

export const appendAnswerShortenerFeedbackRow = async (
  feedback: AnswerShortenerFeedbackRequest,
) =>
  appendRow(config.zoho.answerShortenerWorksheetName, {
    timestamp: getIstTimestamp(),
    ...feedback,
  });

export const downloadRetrievalFeedback = () =>
  downloadFeedback(
    config.zoho.retrievalWorksheetName,
    retrievalHeaders,
    'retrieval',
  );

export const downloadAnswerShortenerFeedback = () =>
  downloadFeedback(
    config.zoho.answerShortenerWorksheetName,
    answerShortenerHeaders,
    'answer-shortener',
  );

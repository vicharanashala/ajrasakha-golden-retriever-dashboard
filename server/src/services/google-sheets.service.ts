import { google } from 'googleapis';
import { config } from '../config.js';
import type { FeedbackRequest } from '../validation/feedback.schema.js';
import type { AnswerShortenerFeedbackRequest } from '../validation/answer-shortener-feedback.schema.js';

export class GoogleSheetsError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 502,
  ) {
    super(message);
    this.name = 'GoogleSheetsError';
  }
}

const requiredGoogleSheetsConfig = () => {
  const missing = [
    ['GOOGLE_APPLICATION_CREDENTIALS', config.googleSheets.credentialsPath],
    ['GOOGLE_SHEETS_SPREADSHEET_ID', config.googleSheets.spreadsheetId],
    ['GOOGLE_RETRIEVAL_WORKSHEET_NAME', config.googleSheets.retrievalWorksheetName],
    ['GOOGLE_ANSWER_SHORTENER_WORKSHEET_NAME', config.googleSheets.answerShortenerWorksheetName],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new GoogleSheetsError(
      `Google Sheets feedback is not configured. Missing: ${missing.join(', ')}.`,
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

const toSheetRange = (worksheetName: string) =>
  `'${worksheetName.replaceAll("'", "''")}'!A:Z`;

const appendRow = async (worksheetName: string, values: Array<string | number>) => {
  requiredGoogleSheetsConfig();

  const auth = new google.auth.GoogleAuth({
    keyFile: config.googleSheets.credentialsPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: config.googleSheets.spreadsheetId,
      range: toSheetRange(worksheetName),
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        majorDimension: 'ROWS',
        values: [values],
      },
    });
  } catch (error) {
    throw new GoogleSheetsError(
      'Google Sheets could not save this feedback. Confirm the service account has Editor access to the spreadsheet.',
      502,
    );
  }
};

export const appendRetrievalFeedbackRow = async (feedback: FeedbackRequest) =>
  appendRow(config.googleSheets.retrievalWorksheetName, [
    getIstTimestamp(),
    feedback.tester_name,
    feedback.input_question,
    feedback.state,
    feedback.crop,
    feedback.retrieved_question_api_v1,
    feedback.retrieved_question_api_v2,
    feedback.retrieved_answer_with_sources_v1,
    feedback.retrieved_answer_with_sources_v2,
    feedback.question_id_v1,
    feedback.question_id_v2,
    feedback.similarity_score,
    feedback.retrieval_source,
    feedback.all_other_fetched_questions_v1,
    feedback.all_other_fetched_questions_v2,
    feedback.issue_faced,
  ]);

export const appendAnswerShortenerFeedbackRow = async (
  feedback: AnswerShortenerFeedbackRequest,
) =>
  appendRow(config.googleSheets.answerShortenerWorksheetName, [
    getIstTimestamp(),
    feedback.tester_name,
    feedback.original_query,
    feedback.expected_number_of_characters,
    feedback.full_answer,
    feedback.short_answer,
    feedback.original_character_count,
    feedback.expected_character_count,
    feedback.min_character_count,
    feedback.max_character_count,
    feedback.actual_character_count,
    feedback.footer_character_count,
    feedback.tolerance,
    feedback.issue_faced,
  ]);

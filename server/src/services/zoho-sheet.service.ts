import { config } from '../config.js';
import type { FeedbackRequest } from '../validation/feedback.schema.js';

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
    ['ZOHO_SHEET_WORKSHEET_NAME', config.zoho.worksheetName],
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

const getIstTimestamp = () =>
  new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date());

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

export const appendFeedbackRow = async (feedback: FeedbackRequest) => {
  const accessToken = await getZohoAccessToken();
  const row = {
    timestamp: getIstTimestamp(),
    ...feedback,
  };

  const body = new URLSearchParams({
    method: 'worksheet.records.add',
    worksheet_name: config.zoho.worksheetName,
    header_row: '1',
    json_data: JSON.stringify([row]),
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

  const responseBody = (await response.json().catch(() => ({}))) as {
    status?: unknown;
    error_message?: unknown;
    message?: unknown;
  };

  if (!response.ok || responseBody.status === 'failure') {
    const message =
      typeof responseBody.error_message === 'string'
        ? responseBody.error_message
        : typeof responseBody.message === 'string'
          ? responseBody.message
          : 'Zoho Sheet rejected the feedback row.';

    throw new ZohoSheetError(message);
  }

  return row;
};

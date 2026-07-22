import { Router } from 'express';
import { ZodError } from 'zod';
import {
  appendRetrievalFeedbackRow,
  downloadRetrievalFeedback,
  GoogleSheetsError,
} from '../services/google-sheets.service.js';
import { feedbackRequestSchema } from '../validation/feedback.schema.js';

export const feedbackRouter = Router();

feedbackRouter.get('/download', async (request, response, next) => {
  const testerName =
    typeof request.query.tester_name === 'string'
      ? request.query.tester_name.trim()
      : '';

  if (testerName.length < 2) {
    response.status(400).json({ message: 'A tester name is required.' });
    return;
  }

  try {
    const download = await downloadRetrievalFeedback(testerName);
    response
      .status(200)
      .set({
        'Content-Disposition': `attachment; filename="${download.filename}"`,
        'Content-Type': 'text/csv; charset=utf-8',
      })
      .send(download.csv);
  } catch (error) {
    if (error instanceof GoogleSheetsError) {
      response.status(error.statusCode).json({ message: error.message });
      return;
    }

    next(error);
  }
});

feedbackRouter.post('/', async (request, response, next) => {
  try {
    const feedback = feedbackRequestSchema.parse(request.body);
    await appendRetrievalFeedbackRow(feedback);

    response.status(201).json({ message: 'Feedback submitted.' });
  } catch (error) {
    if (error instanceof ZodError) {
      response.status(400).json({
        message: 'Feedback validation failed.',
        fieldErrors: error.flatten().fieldErrors,
      });
      return;
    }

    if (error instanceof GoogleSheetsError) {
      response.status(error.statusCode).json({ message: error.message });
      return;
    }

    next(error);
  }
});

import { Router } from 'express';
import { ZodError } from 'zod';
import {
  appendAnswerShortenerFeedbackRow,
  downloadAnswerShortenerFeedback,
  GoogleSheetsError,
} from '../services/google-sheets.service.js';
import { answerShortenerFeedbackRequestSchema } from '../validation/answer-shortener-feedback.schema.js';

export const answerShortenerFeedbackRouter = Router();

answerShortenerFeedbackRouter.get('/download', async (request, response, next) => {
  const testerName =
    typeof request.query.tester_name === 'string'
      ? request.query.tester_name.trim()
      : '';

  if (testerName.length < 2) {
    response.status(400).json({ message: 'A tester name is required.' });
    return;
  }

  try {
    const download = await downloadAnswerShortenerFeedback(testerName);
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

answerShortenerFeedbackRouter.post('/', async (request, response, next) => {
  try {
    const feedback = answerShortenerFeedbackRequestSchema.parse(request.body);
    await appendAnswerShortenerFeedbackRow(feedback);
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

import { Router } from 'express';
import { ZodError } from 'zod';
import {
  appendRetrievalFeedbackRow,
  downloadRetrievalFeedback,
  ZohoSheetError,
} from '../services/zoho-sheet.service.js';
import { feedbackRequestSchema } from '../validation/feedback.schema.js';

export const feedbackRouter = Router();

feedbackRouter.get('/download', async (request, response, next) => {
  try {
    const download = await downloadRetrievalFeedback();
    response
      .status(200)
      .set({
        'Content-Disposition': `attachment; filename="${download.filename}"`,
        'Content-Type': 'text/csv; charset=utf-8',
      })
      .send(download.csv);
  } catch (error) {
    if (error instanceof ZohoSheetError) {
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

    if (error instanceof ZohoSheetError) {
      response.status(error.statusCode).json({ message: error.message });
      return;
    }

    next(error);
  }
});

import { Router } from 'express';
import { ZodError } from 'zod';
import { appendFeedbackRow, ZohoSheetError } from '../services/zoho-sheet.service.js';
import { feedbackRequestSchema } from '../validation/feedback.schema.js';

export const feedbackRouter = Router();

feedbackRouter.post('/', async (request, response, next) => {
  try {
    const feedback = feedbackRequestSchema.parse(request.body);
    await appendFeedbackRow(feedback);

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

import { Router } from 'express';
import { ZodError } from 'zod';
import {
  appendAnswerShortenerFeedbackRow,
  GoogleSheetsError,
} from '../services/google-sheets.service.js';
import { answerShortenerFeedbackRequestSchema } from '../validation/answer-shortener-feedback.schema.js';

export const answerShortenerFeedbackRouter = Router();

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

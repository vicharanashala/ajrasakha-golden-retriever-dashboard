import { Router } from 'express';
import {
  AnswerShortenerServiceError,
  shortenAnswer,
} from '../services/answer-shortener.service.js';
import { answerShortenerRequestSchema } from '../validation/answer-shortener.schema.js';

export const answerShortenerRouter = Router();

answerShortenerRouter.post('/', async (request, response, next) => {
  const parsed = answerShortenerRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({
      message: 'Please correct the highlighted answer-shortener fields.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    response.json(await shortenAnswer(parsed.data));
  } catch (error) {
    if (error instanceof AnswerShortenerServiceError) {
      response.status(error.statusCode).json({
        message: error.message,
        details: error.details,
      });
      return;
    }

    next(error);
  }
});

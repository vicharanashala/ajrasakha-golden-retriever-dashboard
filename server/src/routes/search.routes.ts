import { Router } from 'express';
import {
  RetrievalServiceError,
  searchGoldenDatabase,
} from '../services/retrieval.service.js';
import type { ApiVersion } from '../types/retrieval.js';
import { searchRequestSchema } from '../validation/search.schema.js';

export const searchRouter = Router();

searchRouter.post('/', async (request, response, next) => {
  const requestedVersion = request.query.version;
  if (requestedVersion !== 'v1' && requestedVersion !== 'v2') {
    response.status(400).json({ message: 'Unsupported API version.' });
    return;
  }

  const parsed = searchRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({
      message: 'Please correct the highlighted search fields.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const upstreamResponse = await searchGoldenDatabase(
      parsed.data,
      requestedVersion as ApiVersion,
    );
    response.json(upstreamResponse);
  } catch (error) {
    if (error instanceof RetrievalServiceError) {
      response.status(error.statusCode).json({
        message: error.message,
        details: error.details,
      });
      return;
    }

    next(error);
  }
});

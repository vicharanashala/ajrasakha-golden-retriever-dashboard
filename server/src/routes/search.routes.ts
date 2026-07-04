import { Router } from 'express';
import { normalizeSearchResponse } from '../services/normalize-response.js';
import {
  RetrievalServiceError,
  searchGoldenDatabase,
} from '../services/retrieval.service.js';
import { searchRequestSchema } from '../validation/search.schema.js';

export const searchRouter = Router();

searchRouter.post('/', async (request, response, next) => {
  const requestedVersion = request.query.version;
  if (
    requestedVersion !== undefined &&
    requestedVersion !== 'v1' &&
    requestedVersion !== 'v2'
  ) {
    response.status(400).json({ message: 'Unsupported API version.' });
    return;
  }

  const apiVersion = requestedVersion === 'v2' ? 'v2' : 'v1';
  const parsed = searchRequestSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({
      message: 'Please correct the highlighted search fields.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const startedAt = performance.now();

  try {
    const upstreamResponse = await searchGoldenDatabase(parsed.data, apiVersion);
    const responseTimeMs = Math.round(performance.now() - startedAt);
    const normalized = normalizeSearchResponse(upstreamResponse, responseTimeMs);

    response.json(normalized);
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

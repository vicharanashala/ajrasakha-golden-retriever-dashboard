import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { feedbackRouter } from './routes/feedback.routes.js';
import { searchRouter } from './routes/search.routes.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: config.clientOrigin }));
app.use(express.json({ limit: '512kb' }));

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.use('/api/search', searchRouter);
app.use('/api/feedback', feedbackRouter);

const clientBuildPath = path.resolve(import.meta.dirname, '../../client/dist');

if (config.nodeEnv === 'production' && existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  app.use((request, response, next) => {
    if (request.method === 'GET' && request.accepts('html')) {
      response.sendFile(path.join(clientBuildPath, 'index.html'));
      return;
    }
    next();
  });
}

app.use((_request, response) => {
  response.status(404).json({ message: 'Route not found.' });
});

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ message: 'An unexpected server error occurred.' });
};

app.use(errorHandler);

import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from './app.js';

describe('dashboard proxy', () => {
  it('returns health information', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('requires an explicitly supported API version', async () => {
    const response = await request(app).post('/api/search').send({});

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Unsupported');
  });

  it('rejects incomplete requests before calling FastAPI', async () => {
    const response = await request(app).post('/api/search?version=v1').send({
      rephrased_query: '',
      crop: 'Wheat',
    });

    expect(response.status).toBe(400);
    expect(response.body.fieldErrors).toHaveProperty('rephrased_query');
    expect(response.body.fieldErrors).toHaveProperty('state');
  });
});

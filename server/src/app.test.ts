import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from './app.js';

describe('API application', () => {
  it('returns health information', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('rejects incomplete search requests before calling upstream', async () => {
    const response = await request(app).post('/api/search').send({
      rephrased_query: '',
      crop: 'Wheat',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('correct');
    expect(response.body.fieldErrors).toHaveProperty('rephrased_query');
    expect(response.body.fieldErrors).toHaveProperty('state');
  });
});

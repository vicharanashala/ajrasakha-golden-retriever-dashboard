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

  it('rejects incomplete answer-shortener requests before calling FastAPI', async () => {
    const response = await request(app).post('/api/answer-shortener').send({
      original_query: '',
      answer: 'An answer',
    });

    expect(response.status).toBe(400);
    expect(response.body.fieldErrors).toHaveProperty('original_query');
    expect(response.body.fieldErrors).toHaveProperty('expected_character_count');
  });

  it('rejects incomplete answer-shortener feedback before calling Zoho Sheet', async () => {
    const response = await request(app)
      .post('/api/answer-shortener-feedback')
      .send({ tester_name: 'Tester', original_query: 'Query' });

    expect(response.status).toBe(400);
    expect(response.body.fieldErrors).toHaveProperty('issue_faced');
    expect(response.body.fieldErrors).toHaveProperty('full_answer');
  });

});

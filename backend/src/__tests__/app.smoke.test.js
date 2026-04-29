process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../app');

describe('API smoke tests', () => {
  test('GET /api/health returns service metadata', async () => {
    const res = await request(app).get('/api/health');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('VoteChain API is running');
    expect(res.body.version).toBe('1.0.0');
    expect(typeof res.body.timestamp).toBe('string');
  });

  test('GET unknown route returns 404 payload', async () => {
    const res = await request(app).get('/api/does-not-exist');

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('/api/does-not-exist');
  });
});

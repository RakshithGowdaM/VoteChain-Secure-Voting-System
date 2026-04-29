process.env.NODE_ENV = 'test';

jest.mock('../models/Vote', () => ({
  findOne: jest.fn(),
  find: jest.fn(),
}));

const request = require('supertest');
const app = require('../app');
const Vote = require('../models/Vote');

describe('Vote verification endpoint', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/vote/verify/:txHash returns vote details when found', async () => {
    Vote.findOne.mockResolvedValue({
      transactionHash: '0xabc123',
      blockNumber: 12345,
      status: 'confirmed',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      candidateId: 'C001',
    });

    const res = await request(app).get('/api/vote/verify/0xabc123');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.transactionHash).toBe('0xabc123');
    expect(res.body.data.candidateId).toBe('C001');
  });

  test('GET /api/vote/verify/:txHash returns 404 when tx is missing', async () => {
    Vote.findOne.mockResolvedValue(null);

    const res = await request(app).get('/api/vote/verify/0xmissing');

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Transaction not found');
  });
});

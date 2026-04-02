import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/db';

beforeAll(async () => {
  await prisma.financialRecord.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.financialRecord.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('Auth flow', () => {
  let accessToken: string;
  let refreshToken: string;

  it('POST /api/auth/register — creates user and returns tokens', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: 'test@finledger.com',
      password: 'Test@1234',
      role: 'viewer',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.email).toBe('test@finledger.com');
  });

  it('POST /api/auth/register — rejects duplicate email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: 'test@finledger.com',
      password: 'Test@1234',
    });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/login — returns tokens on valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'test@finledger.com',
      password: 'Test@1234',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    accessToken = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });

  it('POST /api/auth/login — rejects wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'test@finledger.com',
      password: 'WrongPass1',
    });
    expect(res.status).toBe(401);
  });

  it('GET /api/dashboard/summary — accessible with valid token', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/dashboard/summary — 401 without token', async () => {
    const res = await request(app).get('/api/dashboard/summary');
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/refresh — issues new access token', async () => {
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    // Update tokens after rotation
    accessToken = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });

  it('POST /api/auth/refresh — rejects reused (rotated) token', async () => {
    // Use the new token to get another pair
    const res1 = await request(app).post('/api/auth/refresh').send({ refreshToken });
    const oldToken = refreshToken;
    refreshToken = res1.body.data.refreshToken;

    // Try to reuse the old token
    const res2 = await request(app).post('/api/auth/refresh').send({ refreshToken: oldToken });
    expect(res2.status).toBe(401);
  });

  it('POST /api/auth/logout — revokes refresh token', async () => {
    const res = await request(app).post('/api/auth/logout').send({ refreshToken });
    expect(res.status).toBe(200);

    // Revoked token should no longer work
    const res2 = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(res2.status).toBe(401);
  });
});

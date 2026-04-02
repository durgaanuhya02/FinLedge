import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/db';

let viewerToken: string;
let analystToken: string;
let adminToken: string;

beforeAll(async () => {
  await prisma.financialRecord.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // Register all three roles
  const [v, a, ad] = await Promise.all([
    request(app).post('/api/auth/register').send({ name: 'Viewer', email: 'viewer@test.com', password: 'Test@1234', role: 'viewer' }),
    request(app).post('/api/auth/register').send({ name: 'Analyst', email: 'analyst@test.com', password: 'Test@1234', role: 'analyst' }),
    request(app).post('/api/auth/register').send({ name: 'Admin', email: 'admin@test.com', password: 'Test@1234', role: 'admin' }),
  ]);

  viewerToken = v.body.data.accessToken;
  analystToken = a.body.data.accessToken;
  adminToken = ad.body.data.accessToken;
});

afterAll(async () => {
  await prisma.financialRecord.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('RBAC enforcement', () => {
  it('viewer: GET /api/records — allowed (200)', async () => {
    const res = await request(app).get('/api/records').set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
  });

  it('viewer: POST /api/records — forbidden (403)', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ amount: 100, type: 'income', category: 'salary', date: '2025-01-01' });
    expect(res.status).toBe(403);
  });

  it('analyst: POST /api/records — forbidden (403)', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${analystToken}`)
      .send({ amount: 100, type: 'income', category: 'salary', date: '2025-01-01' });
    expect(res.status).toBe(403);
  });

  it('admin: POST /api/records — allowed (201)', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 500, type: 'income', category: 'salary', date: '2025-01-15' });
    expect(res.status).toBe(201);
  });

  it('viewer: GET /api/users — forbidden (403)', async () => {
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(403);
  });

  it('analyst: GET /api/users — forbidden (403)', async () => {
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${analystToken}`);
    expect(res.status).toBe(403);
  });

  it('admin: GET /api/users — allowed (200)', async () => {
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('viewer: GET /api/dashboard/top-categories — forbidden (403)', async () => {
    const res = await request(app).get('/api/dashboard/top-categories').set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(403);
  });

  it('analyst: GET /api/dashboard/top-categories — allowed (200)', async () => {
    const res = await request(app).get('/api/dashboard/top-categories').set('Authorization', `Bearer ${analystToken}`);
    expect(res.status).toBe(200);
  });
});

import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/db';

let adminToken: string;
let recordId: string;

beforeAll(async () => {
  await prisma.financialRecord.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const res = await request(app).post('/api/auth/register').send({
    name: 'Admin', email: 'admin@records.test', password: 'Test@1234', role: 'admin',
  });
  adminToken = res.body.data.accessToken;
});

afterAll(async () => {
  await prisma.financialRecord.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('Records CRUD', () => {
  it('POST /api/records — creates a record', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 1500.50, type: 'income', category: 'salary', date: '2025-03-01', notes: 'March salary' });
    expect(res.status).toBe(201);
    expect(res.body.data.amount).toBe(1500.50);
    expect(res.body.data.category).toBe('salary');
    recordId = res.body.data.id;
  });

  it('POST /api/records — rejects invalid amount', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: -100, type: 'income', category: 'salary', date: '2025-03-01' });
    expect(res.status).toBe(400);
  });

  it('POST /api/records — rejects future date', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 100, type: 'income', category: 'salary', date: '2099-01-01' });
    expect(res.status).toBe(400);
  });

  it('GET /api/records — returns paginated list', async () => {
    const res = await request(app)
      .get('/api/records?page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/records/:id — returns single record', async () => {
    const res = await request(app)
      .get(`/api/records/${recordId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(recordId);
  });

  it('PATCH /api/records/:id — updates record', async () => {
    const res = await request(app)
      .patch(`/api/records/${recordId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'Updated notes', amount: 2000 });
    expect(res.status).toBe(200);
    expect(res.body.data.notes).toBe('Updated notes');
    expect(res.body.data.amount).toBe(2000);
  });

  it('DELETE /api/records/:id — soft deletes record', async () => {
    const res = await request(app)
      .delete(`/api/records/${recordId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.isDeleted).toBe(true);
  });

  it('GET /api/records/:id — 404 after soft delete', async () => {
    const res = await request(app)
      .get(`/api/records/${recordId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});

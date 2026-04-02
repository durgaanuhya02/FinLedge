import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/db';

let adminToken: string;

beforeAll(async () => {
  await prisma.financialRecord.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const res = await request(app).post('/api/auth/register').send({
    name: 'Admin', email: 'admin@dash.test', password: 'Test@1234', role: 'admin',
  });
  adminToken = res.body.data.accessToken;
  const userId = res.body.data.user.id;

  // Seed known records for deterministic assertions
  await prisma.financialRecord.createMany({
    data: [
      { userId, amount: 3000, type: 'income', category: 'salary', date: new Date('2025-01-15') },
      { userId, amount: 1000, type: 'income', category: 'freelance', date: new Date('2025-02-10') },
      { userId, amount: 500, type: 'expense', category: 'rent', date: new Date('2025-01-20') },
      { userId, amount: 200, type: 'expense', category: 'food', date: new Date('2025-02-05') },
    ],
  });
});

afterAll(async () => {
  await prisma.financialRecord.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('Dashboard', () => {
  it('GET /api/dashboard/summary — returns correct totals', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.total_income).toBe(4000);
    expect(res.body.data.total_expenses).toBe(700);
    expect(res.body.data.net_balance).toBe(3300);
    expect(res.body.data.record_count).toBe(4);
  });

  it('GET /api/dashboard/by-category — returns category breakdown', async () => {
    const res = await request(app)
      .get('/api/dashboard/by-category')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.salary.income).toBe(3000);
    expect(res.body.data.rent.expense).toBe(500);
  });

  it('GET /api/dashboard/trends — returns monthly trend array', async () => {
    const res = await request(app)
      .get('/api/dashboard/trends?period=monthly')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0]).toHaveProperty('period_label');
    expect(res.body.data[0]).toHaveProperty('income');
    expect(res.body.data[0]).toHaveProperty('expense');
    expect(res.body.data[0]).toHaveProperty('net');
  });

  it('GET /api/dashboard/recent — returns up to 10 records', async () => {
    const res = await request(app)
      .get('/api/dashboard/recent')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeLessThanOrEqual(10);
  });

  it('GET /api/dashboard/top-categories — returns top expense categories', async () => {
    const res = await request(app)
      .get('/api/dashboard/top-categories')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0]).toHaveProperty('category');
    expect(res.body.data[0]).toHaveProperty('total');
    // rent (500) should be top expense
    expect(res.body.data[0].category).toBe('rent');
  });
});

import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/db';
import crypto from 'crypto';

function hashToken(t: string) {
  return crypto.createHash('sha256').update(t).digest('hex');
}

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

describe('Email verification', () => {
  let userId: string;

  it('register sets emailVerified=false and stores a verifyToken', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Email User',
      email: 'emailtest@finledger.com',
      password: 'Test@1234',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.user.emailVerified).toBe(false);

    const user = await prisma.user.findUnique({ where: { email: 'emailtest@finledger.com' } });
    expect(user?.verifyToken).toBeTruthy();
    userId = user!.id;
  });

  it('GET /api/auth/verify-email — invalid token returns 400', async () => {
    const res = await request(app).get('/api/auth/verify-email?token=badtoken');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/auth/verify-email — valid token verifies email', async () => {
    // Get the raw token by generating a known one and setting it directly
    const rawToken = 'testverifytoken123';
    await prisma.user.update({
      where: { id: userId },
      data: {
        verifyToken: hashToken(rawToken),
        verifyTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const res = await request(app).get(`/api/auth/verify-email?token=${rawToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.message).toMatch(/verified/i);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user?.emailVerified).toBe(true);
    expect(user?.verifyToken).toBeNull();
  });

  it('GET /api/auth/verify-email — already used token returns 400', async () => {
    const res = await request(app).get('/api/auth/verify-email?token=testverifytoken123');
    expect(res.status).toBe(400);
  });

  it('POST /api/auth/resend-verification — already verified returns 409', async () => {
    const res = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: 'emailtest@finledger.com' });
    expect(res.status).toBe(409);
  });

  it('POST /api/auth/resend-verification — unverified user gets new token', async () => {
    // Register a new unverified user
    await request(app).post('/api/auth/register').send({
      name: 'Unverified',
      email: 'unverified@finledger.com',
      password: 'Test@1234',
    });

    const res = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: 'unverified@finledger.com' });
    expect(res.status).toBe(200);
    expect(res.body.data.message).toMatch(/sent/i);
  });
});

describe('Password reset', () => {
  let userId: string;

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Reset User',
      email: 'resettest@finledger.com',
      password: 'OldPass@1234',
    });
    userId = res.body.data.user.id;
  });

  it('POST /api/auth/forgot-password — always returns 200 (no enumeration)', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'doesnotexist@finledger.com' });
    expect(res.status).toBe(200);
    expect(res.body.data.message).toMatch(/sent/i);
  });

  it('POST /api/auth/forgot-password — sets reset token for real user', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'resettest@finledger.com' });
    expect(res.status).toBe(200);

    const user = await prisma.user.findUnique({ where: { email: 'resettest@finledger.com' } });
    expect(user?.resetToken).toBeTruthy();
  });

  it('POST /api/auth/reset-password — invalid token returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'badtoken', password: 'NewPass@1234' });
    expect(res.status).toBe(400);
  });

  it('POST /api/auth/reset-password — valid token resets password', async () => {
    const rawToken = 'testresettoken456';
    await prisma.user.update({
      where: { id: userId },
      data: {
        resetToken: hashToken(rawToken),
        resetTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawToken, password: 'NewPass@1234' });
    expect(res.status).toBe(200);
    expect(res.body.data.message).toMatch(/reset/i);

    // Old password no longer works
    const loginOld = await request(app).post('/api/auth/login').send({
      email: 'resettest@finledger.com', password: 'OldPass@1234',
    });
    expect(loginOld.status).toBe(401);

    // New password works
    const loginNew = await request(app).post('/api/auth/login').send({
      email: 'resettest@finledger.com', password: 'NewPass@1234',
    });
    expect(loginNew.status).toBe(200);
  });

  it('POST /api/auth/reset-password — expired token returns 400', async () => {
    const rawToken = 'expiredtoken789';
    await prisma.user.update({
      where: { id: userId },
      data: {
        resetToken: hashToken(rawToken),
        resetTokenExpiresAt: new Date(Date.now() - 1000), // already expired
      },
    });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawToken, password: 'AnotherPass@1' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/expired/i);
  });

  it('POST /api/auth/reset-password — weak password returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'anytoken', password: 'weak' });
    expect(res.status).toBe(400);
  });
});

describe('Google OAuth user creation', () => {
  it('findOrCreateGoogleUser — creates new user from Google profile', async () => {
    const { findOrCreateGoogleUser } = await import('../src/modules/auth/auth.service');
    const user = await findOrCreateGoogleUser({
      googleId: 'google_123',
      email: 'googleuser@gmail.com',
      name: 'Google User',
    });
    expect(user.email).toBe('googleuser@gmail.com');
    expect(user.googleId).toBe('google_123');
    expect(user.emailVerified).toBe(true);
    expect(user.passwordHash).toBeNull();
  });

  it('findOrCreateGoogleUser — links Google ID to existing email/password user', async () => {
    // Register normally first
    await request(app).post('/api/auth/register').send({
      name: 'Existing User',
      email: 'existing@finledger.com',
      password: 'Test@1234',
    });

    const { findOrCreateGoogleUser } = await import('../src/modules/auth/auth.service');
    const user = await findOrCreateGoogleUser({
      googleId: 'google_456',
      email: 'existing@finledger.com',
      name: 'Existing User',
    });

    expect(user.googleId).toBe('google_456');
    expect(user.emailVerified).toBe(true);
  });

  it('findOrCreateGoogleUser — returns same user on second Google login', async () => {
    const { findOrCreateGoogleUser } = await import('../src/modules/auth/auth.service');
    const user1 = await findOrCreateGoogleUser({ googleId: 'google_789', email: 'repeat@gmail.com', name: 'Repeat' });
    const user2 = await findOrCreateGoogleUser({ googleId: 'google_789', email: 'repeat@gmail.com', name: 'Repeat' });
    expect(user1.id).toBe(user2.id);
  });
});

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../../config/db';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from '../../utils/errors';
import { sendVerificationEmail, sendPasswordResetEmail } from '../../config/mailer';
import { z } from 'zod';
import { registerSchema, loginSchema } from './auth.schema';

const SALT_ROUNDS = 12;

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function refreshExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d;
}

function generateOpaqueToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// ─── Register ────────────────────────────────────────────────────────────────

export async function register(input: z.infer<typeof registerSchema>) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new ConflictError('Email already registered');

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const verifyToken = generateOpaqueToken();
  const verifyTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
      verifyToken: hashToken(verifyToken),
      verifyTokenExpiresAt,
    },
    select: { id: true, name: true, email: true, role: true, status: true, emailVerified: true, createdAt: true },
  });

  // Send verification email (non-blocking — don't fail registration if email fails)
  sendVerificationEmail(user.email, user.name, verifyToken).catch((e) =>
    console.error('[Mailer] Failed to send verification email:', e.message)
  );

  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  const rawRefresh = signRefreshToken({ userId: user.id, role: user.role });
  await prisma.refreshToken.create({
    data: { userId: user.id, token: hashToken(rawRefresh), expiresAt: refreshExpiresAt() },
  });

  return { accessToken, refreshToken: rawRefresh, user };
}

// ─── Verify Email ─────────────────────────────────────────────────────────────

export async function verifyEmail(token: string) {
  const hashed = hashToken(token);
  const user = await prisma.user.findFirst({
    where: { verifyToken: hashed, emailVerified: false },
  });

  if (!user) throw new ValidationError('Invalid or already used verification token');
  if (user.verifyTokenExpiresAt && user.verifyTokenExpiresAt < new Date()) {
    throw new ValidationError('Verification token has expired. Please request a new one.');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verifyToken: null, verifyTokenExpiresAt: null },
  });

  return { message: 'Email verified successfully' };
}

// ─── Resend Verification ──────────────────────────────────────────────────────

export async function resendVerification(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new NotFoundError('User not found');
  if (user.emailVerified) throw new ConflictError('Email is already verified');

  const verifyToken = generateOpaqueToken();
  const verifyTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { verifyToken: hashToken(verifyToken), verifyTokenExpiresAt },
  });

  await sendVerificationEmail(user.email, user.name, verifyToken);
  return { message: 'Verification email sent' };
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function login(input: z.infer<typeof loginSchema>) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || user.status === 'inactive') throw new UnauthorizedError('Invalid credentials');
  if (!user.passwordHash) throw new UnauthorizedError('This account uses Google sign-in. Please login with Google.');

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw new UnauthorizedError('Invalid credentials');

  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  const rawRefresh = signRefreshToken({ userId: user.id, role: user.role });
  await prisma.refreshToken.create({
    data: { userId: user.id, token: hashToken(rawRefresh), expiresAt: refreshExpiresAt() },
  });

  const { passwordHash: _, verifyToken: __, resetToken: ___, ...safeUser } = user;
  return { accessToken, refreshToken: rawRefresh, user: safeUser };
}

// ─── Forgot Password ──────────────────────────────────────────────────────────

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always return success to prevent email enumeration
  if (!user || !user.passwordHash) return { message: 'If that email exists, a reset link has been sent' };

  const resetToken = generateOpaqueToken();
  const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: hashToken(resetToken), resetTokenExpiresAt },
  });

  await sendPasswordResetEmail(user.email, user.name, resetToken).catch((e) =>
    console.error('[Mailer] Failed to send reset email:', e.message)
  );

  return { message: 'If that email exists, a reset link has been sent' };
}

// ─── Reset Password ───────────────────────────────────────────────────────────

export async function resetPassword(token: string, newPassword: string) {
  const hashed = hashToken(token);
  const user = await prisma.user.findFirst({ where: { resetToken: hashed } });

  if (!user) throw new ValidationError('Invalid or expired reset token');
  if (user.resetTokenExpiresAt && user.resetTokenExpiresAt < new Date()) {
    throw new ValidationError('Reset token has expired. Please request a new one.');
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetToken: null, resetTokenExpiresAt: null },
  });

  // Revoke all existing refresh tokens for security
  await prisma.refreshToken.updateMany({ where: { userId: user.id }, data: { revoked: true } });

  return { message: 'Password reset successfully. Please log in again.' };
}

// ─── Refresh ──────────────────────────────────────────────────────────────────

export async function refresh(rawToken: string) {
  let payload: { userId: string; role: string };
  try {
    payload = verifyRefreshToken(rawToken);
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const hashed = hashToken(rawToken);
  const stored = await prisma.refreshToken.findUnique({ where: { token: hashed } });
  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    throw new UnauthorizedError('Refresh token is invalid or revoked');
  }

  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });

  const newRawRefresh = signRefreshToken({ userId: payload.userId, role: payload.role });
  await prisma.refreshToken.create({
    data: { userId: payload.userId, token: hashToken(newRawRefresh), expiresAt: refreshExpiresAt() },
  });

  const accessToken = signAccessToken({ userId: payload.userId, role: payload.role });
  return { accessToken, refreshToken: newRawRefresh };
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logout(rawToken: string) {
  const hashed = hashToken(rawToken);
  const stored = await prisma.refreshToken.findUnique({ where: { token: hashed } });
  if (!stored) throw new NotFoundError('Refresh token not found');
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
}

// ─── Google OAuth (called from passport callback) ─────────────────────────────

export async function findOrCreateGoogleUser(profile: {
  googleId: string;
  email: string;
  name: string;
}) {
  // Check if user exists by googleId or email
  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId: profile.googleId }, { email: profile.email }] },
  });

  if (user) {
    // Link Google ID if they registered with email/password before
    if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.googleId, emailVerified: true },
      });
    }
  } else {
    // New user via Google — no password, email auto-verified
    user = await prisma.user.create({
      data: {
        name: profile.name,
        email: profile.email,
        googleId: profile.googleId,
        emailVerified: true,
        role: 'viewer',
      },
    });
  }

  return user;
}

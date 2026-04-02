import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import {
  registerSchema, loginSchema, refreshSchema, logoutSchema,
  forgotPasswordSchema, resetPasswordSchema, resendVerificationSchema,
} from './auth.schema';
import { success } from '../../utils/response';
import { signAccessToken, signRefreshToken } from '../../utils/jwt';
import crypto from 'crypto';
import prisma from '../../config/db';

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function refreshExpiresAt() {
  const d = new Date(); d.setDate(d.getDate() + 7); return d;
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const input = registerSchema.parse(req.body);
    const result = await authService.register(input);
    success(res, { ...result, message: 'Registration successful. Please check your email to verify your account.' }, 201);
  } catch (err) { next(err); }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input);
    success(res, result);
  } catch (err) { next(err); }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const result = await authService.refresh(refreshToken);
    success(res, result);
  } catch (err) { next(err); }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = logoutSchema.parse(req.body);
    await authService.logout(refreshToken);
    success(res, { message: 'Logged out successfully' });
  } catch (err) { next(err); }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.query['token'] as string;
    if (!token) return next(new Error('Token is required'));
    const result = await authService.verifyEmail(token);
    success(res, result);
  } catch (err) { next(err); }
}

export async function resendVerification(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = resendVerificationSchema.parse(req.body);
    const result = await authService.resendVerification(email);
    success(res, result);
  } catch (err) { next(err); }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const result = await authService.forgotPassword(email);
    success(res, result);
  } catch (err) { next(err); }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);
    const result = await authService.resetPassword(token, password);
    success(res, result);
  } catch (err) { next(err); }
}

// Called after passport Google strategy succeeds
export async function googleCallback(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user as any;
    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    const rawRefresh = signRefreshToken({ userId: user.id, role: user.role });
    await prisma.refreshToken.create({
      data: { userId: user.id, token: hashToken(rawRefresh), expiresAt: refreshExpiresAt() },
    });
    // In a real app you'd redirect to frontend with tokens in query/cookie
    // Here we return JSON for API usage
    success(res, { accessToken, refreshToken: rawRefresh, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) { next(err); }
}

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';

export interface TokenPayload {
  userId: string;
  role: string;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign({ ...payload, jti: crypto.randomUUID() }, env.jwt.accessSecret, { expiresIn: env.jwt.accessExpiry } as jwt.SignOptions);
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign({ ...payload, jti: crypto.randomUUID() }, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpiry } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, env.jwt.accessSecret) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, env.jwt.refreshSecret) as TokenPayload;
}

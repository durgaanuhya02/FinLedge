/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 *
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user (sends verification email)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string }
 *               role: { type: string, enum: [viewer, analyst, admin] }
 *     responses:
 *       201: { description: Registered — check email to verify }
 *       409: { description: Email already exists }
 *
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email + password
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login successful }
 *       401: { description: Invalid credentials }
 *
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: New access token issued }
 *
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout (revoke refresh token)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: Logged out }
 *
 * /api/auth/verify-email:
 *   get:
 *     tags: [Auth]
 *     summary: Verify email address via token from email link
 *     security: []
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Email verified }
 *       400: { description: Invalid or expired token }
 *
 * /api/auth/resend-verification:
 *   post:
 *     tags: [Auth]
 *     summary: Resend verification email
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string }
 *     responses:
 *       200: { description: Verification email sent }
 *
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request a password reset email
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string }
 *     responses:
 *       200: { description: Reset email sent if account exists }
 *
 * /api/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password using token from email
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Password reset successful }
 *       400: { description: Invalid or expired token }
 *
 * /api/auth/google:
 *   get:
 *     tags: [Auth]
 *     summary: Initiate Google OAuth login (redirects to Google)
 *     security: []
 *     responses:
 *       302: { description: Redirect to Google }
 *
 * /api/auth/google/callback:
 *   get:
 *     tags: [Auth]
 *     summary: Google OAuth callback — returns tokens
 *     security: []
 *     responses:
 *       200: { description: Tokens issued }
 */
import { Router } from 'express';
import passport from '../../config/passport';
import * as ctrl from './auth.controller';
import { authLimiter } from '../../middleware/rateLimiter';

const router = Router();

// Standard auth
router.post('/register', authLimiter, ctrl.register);
router.post('/login', authLimiter, ctrl.login);
router.post('/refresh', authLimiter, ctrl.refresh);
router.post('/logout', authLimiter, ctrl.logout);

// Email verification
router.get('/verify-email', ctrl.verifyEmail);
router.post('/resend-verification', authLimiter, ctrl.resendVerification);

// Password reset
router.post('/forgot-password', authLimiter, ctrl.forgotPassword);
router.post('/reset-password', authLimiter, ctrl.resetPassword);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/api/auth/google/failed' }),
  ctrl.googleCallback
);
router.get('/google/failed', (_req, res) => {
  res.status(401).json({ success: false, error: { code: 'OAUTH_FAILED', message: 'Google authentication failed' } });
});

export default router;

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Aggregated analytics
 *
 * /api/dashboard/summary:
 *   get:
 *     tags: [Dashboard]
 *     summary: Total income, expenses, net balance, record count
 *     responses:
 *       200: { description: Summary data }
 *
 * /api/dashboard/by-category:
 *   get:
 *     tags: [Dashboard]
 *     summary: Category-wise income and expense totals
 *     responses:
 *       200: { description: Category breakdown }
 *
 * /api/dashboard/trends:
 *   get:
 *     tags: [Dashboard]
 *     summary: Time-series income/expense trends
 *     parameters:
 *       - in: query
 *         name: period
 *         schema: { type: string, enum: [weekly, monthly], default: monthly }
 *     responses:
 *       200: { description: Trend data }
 *
 * /api/dashboard/recent:
 *   get:
 *     tags: [Dashboard]
 *     summary: 10 most recent records
 *     responses:
 *       200: { description: Recent records }
 *
 * /api/dashboard/top-categories:
 *   get:
 *     tags: [Dashboard]
 *     summary: Top 5 expense categories (analyst + admin only)
 *     responses:
 *       200: { description: Top categories }
 *       403: { description: Forbidden }
 */
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { apiLimiter } from '../../middleware/rateLimiter';
import * as ctrl from './dashboard.controller';

const router = Router();

router.use(authenticate, apiLimiter);

router.get('/summary', ctrl.getSummary);
router.get('/by-category', ctrl.getByCategory);
router.get('/trends', ctrl.getTrends);
router.get('/recent', ctrl.getRecent);
router.get('/top-categories', authorize('analyst', 'admin'), ctrl.getTopCategories);

export default router;

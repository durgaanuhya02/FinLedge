import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import * as dashboardService from './dashboard.service';
import { success } from '../../utils/response';
import { z } from 'zod';

const trendsSchema = z.object({ period: z.enum(['weekly', 'monthly']).default('monthly') });

export async function getSummary(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await dashboardService.getSummary();
    success(res, data);
  } catch (err) { next(err); }
}

export async function getByCategory(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await dashboardService.getByCategory();
    success(res, data);
  } catch (err) { next(err); }
}

export async function getTrends(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { period } = trendsSchema.parse(req.query);
    const data = await dashboardService.getTrends(period);
    success(res, data);
  } catch (err) { next(err); }
}

export async function getRecent(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await dashboardService.getRecent();
    success(res, data);
  } catch (err) { next(err); }
}

export async function getTopCategories(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await dashboardService.getTopCategories();
    success(res, data);
  } catch (err) { next(err); }
}

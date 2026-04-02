import { Response } from 'express';

export function success(res: Response, data: unknown, statusCode = 200, meta?: object) {
  const body: Record<string, unknown> = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

export function paginated(
  res: Response,
  data: unknown,
  page: number,
  limit: number,
  total: number
) {
  return res.status(200).json({
    success: true,
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

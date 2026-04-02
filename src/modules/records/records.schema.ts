import { z } from 'zod';

const VALID_CATEGORIES = ['salary','freelance','investment','rent','food','transport','healthcare','entertainment','utilities','other'] as const;

export const createRecordSchema = z.object({
  amount: z
    .number({ invalid_type_error: 'Amount must be a number' })
    .positive('Amount must be greater than 0')
    .refine((v) => Math.round(v * 100) / 100 === v, 'Amount can have at most 2 decimal places'),
  type: z.enum(['income', 'expense']),
  category: z.enum(VALID_CATEGORIES),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine((d) => new Date(d) <= new Date(), 'Date cannot be in the future'),
  notes: z.string().optional(),
});

export const updateRecordSchema = createRecordSchema.partial();

export const listRecordsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(['income', 'expense']).optional(),
  category: z.enum(VALID_CATEGORIES).optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  min_amount: z.coerce.number().positive().optional(),
  max_amount: z.coerce.number().positive().optional(),
  sort_by: z.enum(['date', 'amount']).default('date'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

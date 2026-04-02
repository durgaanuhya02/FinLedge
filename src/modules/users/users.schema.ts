import { z } from 'zod';

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  role: z.enum(['viewer', 'analyst', 'admin']).optional(),
});

export const listUsersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['active', 'inactive']).optional(),
  role: z.enum(['viewer', 'analyst', 'admin']).optional(),
});

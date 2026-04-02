import prisma from '../../config/db';
import { ForbiddenError, NotFoundError } from '../../utils/errors';
import { z } from 'zod';
import { updateUserSchema, listUsersSchema } from './users.schema';

const safeSelect = {
  id: true, name: true, email: true, role: true, status: true, createdAt: true, updatedAt: true,
};

export async function listUsers(query: z.infer<typeof listUsersSchema>) {
  const { page, limit, status, role } = query;
  const where = {
    ...(status ? { status } : {}),
    ...(role ? { role } : {}),
  };
  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, select: safeSelect, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.user.count({ where }),
  ]);
  return { users, total };
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: safeSelect });
  if (!user) throw new NotFoundError('User not found');
  return user;
}

export async function updateUser(id: string, requesterId: string, input: z.infer<typeof updateUserSchema>) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('User not found');

  // Admin cannot deactivate themselves
  if (id === requesterId && input.status === 'inactive') {
    throw new ForbiddenError('You cannot deactivate your own account');
  }

  return prisma.user.update({ where: { id }, data: input, select: safeSelect });
}

export async function deleteUser(id: string, requesterId: string) {
  if (id === requesterId) throw new ForbiddenError('You cannot delete your own account');
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('User not found');
  return prisma.user.update({ where: { id }, data: { status: 'inactive' }, select: safeSelect });
}

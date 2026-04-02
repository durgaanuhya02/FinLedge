import prisma from '../../config/db';
import { NotFoundError } from '../../utils/errors';
import { z } from 'zod';
import { createRecordSchema, updateRecordSchema, listRecordsSchema } from './records.schema';

export async function listRecords(query: z.infer<typeof listRecordsSchema>) {
  const { page, limit, type, category, date_from, date_to, min_amount, max_amount, sort_by, sort_order } = query;

  const where: any = {
    isDeleted: false,
    ...(type ? { type } : {}),
    ...(category ? { category } : {}),
    ...(date_from || date_to ? {
      date: {
        ...(date_from ? { gte: new Date(date_from) } : {}),
        ...(date_to ? { lte: new Date(date_to + 'T23:59:59') } : {}),
      },
    } : {}),
    ...(min_amount || max_amount ? {
      amount: {
        ...(min_amount ? { gte: min_amount } : {}),
        ...(max_amount ? { lte: max_amount } : {}),
      },
    } : {}),
  };

  const [records, total] = await Promise.all([
    prisma.financialRecord.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sort_by]: sort_order },
    }),
    prisma.financialRecord.count({ where }),
  ]);

  return { records, total };
}

export async function getRecordById(id: string) {
  const record = await prisma.financialRecord.findFirst({ where: { id, isDeleted: false } });
  if (!record) throw new NotFoundError('Record not found');
  return record;
}

export async function createRecord(userId: string, input: z.infer<typeof createRecordSchema>) {
  return prisma.financialRecord.create({
    data: {
      userId,
      amount: input.amount,
      type: input.type,
      category: input.category,
      date: new Date(input.date),
      notes: input.notes,
    },
  });
}

export async function updateRecord(id: string, input: z.infer<typeof updateRecordSchema>) {
  const record = await prisma.financialRecord.findFirst({ where: { id, isDeleted: false } });
  if (!record) throw new NotFoundError('Record not found');

  return prisma.financialRecord.update({
    where: { id },
    data: {
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...(input.type ? { type: input.type } : {}),
      ...(input.category ? { category: input.category } : {}),
      ...(input.date ? { date: new Date(input.date) } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
  });
}

export async function deleteRecord(id: string) {
  const record = await prisma.financialRecord.findFirst({ where: { id, isDeleted: false } });
  if (!record) throw new NotFoundError('Record not found');
  return prisma.financialRecord.update({ where: { id }, data: { isDeleted: true } });
}

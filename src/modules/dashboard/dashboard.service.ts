import prisma from '../../config/db';

export async function getSummary() {
  const records = await prisma.financialRecord.findMany({ where: { isDeleted: false } });

  let totalIncome = 0;
  let totalExpenses = 0;
  for (const r of records) {
    if (r.type === 'income') totalIncome += r.amount;
    else totalExpenses += r.amount;
  }

  return {
    total_income: +totalIncome.toFixed(2),
    total_expenses: +totalExpenses.toFixed(2),
    net_balance: +(totalIncome - totalExpenses).toFixed(2),
    record_count: records.length,
  };
}

export async function getByCategory() {
  const records = await prisma.financialRecord.findMany({ where: { isDeleted: false } });

  const result: Record<string, { income: number; expense: number }> = {};
  for (const r of records) {
    if (!result[r.category]) result[r.category] = { income: 0, expense: 0 };
    if (r.type === 'income') result[r.category].income += r.amount;
    else result[r.category].expense += r.amount;
  }

  // Round values
  for (const cat of Object.keys(result)) {
    result[cat].income = +result[cat].income.toFixed(2);
    result[cat].expense = +result[cat].expense.toFixed(2);
  }

  return result;
}

export async function getTrends(period: 'weekly' | 'monthly') {
  const now = new Date();
  const buckets: { label: string; from: Date; to: Date }[] = [];

  if (period === 'monthly') {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const from = new Date(d.getFullYear(), d.getMonth(), 1);
      const to = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets.push({ label, from, to });
    }
  } else {
    for (let i = 7; i >= 0; i--) {
      const from = new Date(now);
      from.setDate(now.getDate() - i * 7);
      from.setHours(0, 0, 0, 0);
      const to = new Date(from);
      to.setDate(from.getDate() + 6);
      to.setHours(23, 59, 59, 999);
      const label = `Week of ${from.toISOString().slice(0, 10)}`;
      buckets.push({ label, from, to });
    }
  }

  const records = await prisma.financialRecord.findMany({
    where: { isDeleted: false, date: { gte: buckets[0].from, lte: buckets[buckets.length - 1].to } },
  });

  return buckets.map(({ label, from, to }) => {
    const inBucket = records.filter((r) => r.date >= from && r.date <= to);
    const income = +inBucket.filter((r) => r.type === 'income').reduce((s, r) => s + r.amount, 0).toFixed(2);
    const expense = +inBucket.filter((r) => r.type === 'expense').reduce((s, r) => s + r.amount, 0).toFixed(2);
    return { period_label: label, income, expense, net: +(income - expense).toFixed(2) };
  });
}

export async function getRecent() {
  return prisma.financialRecord.findMany({
    where: { isDeleted: false },
    orderBy: { date: 'desc' },
    take: 10,
  });
}

export async function getTopCategories() {
  const records = await prisma.financialRecord.findMany({
    where: { isDeleted: false, type: 'expense' },
  });

  const totals: Record<string, number> = {};
  for (const r of records) {
    totals[r.category] = (totals[r.category] || 0) + r.amount;
  }

  return Object.entries(totals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([category, total]) => ({ category, total: +total.toFixed(2) }));
}

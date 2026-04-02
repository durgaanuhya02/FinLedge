import './env';
import bcrypt from 'bcryptjs';
import prisma from './db';

const SALT_ROUNDS = 12;
const PASSWORD = 'Test@1234';

const CATEGORIES = ['salary','freelance','investment','rent','food','transport','healthcare','entertainment','utilities','other'] as const;
const INCOME_CATEGORIES = ['salary','freelance','investment'] as const;
const EXPENSE_CATEGORIES = ['rent','food','transport','healthcare','entertainment','utilities','other'] as const;

// Deterministic spread: 30 expenses, 20 income across 6 months
const RECORD_PLAN: { type: 'income' | 'expense'; category: string; amount: number; monthsAgo: number; notes: string }[] = [
  { type: 'income',  category: 'salary',        amount: 4500.00, monthsAgo: 0, notes: 'Monthly salary' },
  { type: 'income',  category: 'salary',        amount: 4500.00, monthsAgo: 1, notes: 'Monthly salary' },
  { type: 'income',  category: 'salary',        amount: 4500.00, monthsAgo: 2, notes: 'Monthly salary' },
  { type: 'income',  category: 'salary',        amount: 4500.00, monthsAgo: 3, notes: 'Monthly salary' },
  { type: 'income',  category: 'salary',        amount: 4500.00, monthsAgo: 4, notes: 'Monthly salary' },
  { type: 'income',  category: 'salary',        amount: 4500.00, monthsAgo: 5, notes: 'Monthly salary' },
  { type: 'income',  category: 'freelance',     amount: 1200.00, monthsAgo: 0, notes: 'Freelance project' },
  { type: 'income',  category: 'freelance',     amount: 850.00,  monthsAgo: 2, notes: 'Freelance project' },
  { type: 'income',  category: 'freelance',     amount: 2000.00, monthsAgo: 4, notes: 'Freelance project' },
  { type: 'income',  category: 'investment',    amount: 320.50,  monthsAgo: 1, notes: 'Dividend income' },
  { type: 'income',  category: 'investment',    amount: 415.75,  monthsAgo: 3, notes: 'Dividend income' },
  { type: 'income',  category: 'investment',    amount: 280.00,  monthsAgo: 5, notes: 'Dividend income' },
  { type: 'income',  category: 'freelance',     amount: 600.00,  monthsAgo: 1, notes: 'Consulting fee' },
  { type: 'income',  category: 'freelance',     amount: 750.00,  monthsAgo: 3, notes: 'Consulting fee' },
  { type: 'income',  category: 'investment',    amount: 190.25,  monthsAgo: 2, notes: 'Stock dividend' },
  { type: 'income',  category: 'investment',    amount: 510.00,  monthsAgo: 4, notes: 'Stock dividend' },
  { type: 'income',  category: 'freelance',     amount: 1100.00, monthsAgo: 5, notes: 'Side project' },
  { type: 'income',  category: 'salary',        amount: 300.00,  monthsAgo: 0, notes: 'Bonus' },
  { type: 'income',  category: 'salary',        amount: 500.00,  monthsAgo: 3, notes: 'Performance bonus' },
  { type: 'income',  category: 'freelance',     amount: 950.00,  monthsAgo: 2, notes: 'Design work' },
  { type: 'expense', category: 'rent',          amount: 1200.00, monthsAgo: 0, notes: 'Monthly rent' },
  { type: 'expense', category: 'rent',          amount: 1200.00, monthsAgo: 1, notes: 'Monthly rent' },
  { type: 'expense', category: 'rent',          amount: 1200.00, monthsAgo: 2, notes: 'Monthly rent' },
  { type: 'expense', category: 'rent',          amount: 1200.00, monthsAgo: 3, notes: 'Monthly rent' },
  { type: 'expense', category: 'rent',          amount: 1200.00, monthsAgo: 4, notes: 'Monthly rent' },
  { type: 'expense', category: 'rent',          amount: 1200.00, monthsAgo: 5, notes: 'Monthly rent' },
  { type: 'expense', category: 'food',          amount: 380.00,  monthsAgo: 0, notes: 'Groceries & dining' },
  { type: 'expense', category: 'food',          amount: 420.50,  monthsAgo: 1, notes: 'Groceries & dining' },
  { type: 'expense', category: 'food',          amount: 310.75,  monthsAgo: 2, notes: 'Groceries & dining' },
  { type: 'expense', category: 'food',          amount: 395.00,  monthsAgo: 3, notes: 'Groceries & dining' },
  { type: 'expense', category: 'food',          amount: 450.25,  monthsAgo: 4, notes: 'Groceries & dining' },
  { type: 'expense', category: 'food',          amount: 360.00,  monthsAgo: 5, notes: 'Groceries & dining' },
  { type: 'expense', category: 'transport',     amount: 85.00,   monthsAgo: 0, notes: 'Fuel & transit' },
  { type: 'expense', category: 'transport',     amount: 120.00,  monthsAgo: 1, notes: 'Fuel & transit' },
  { type: 'expense', category: 'transport',     amount: 95.50,   monthsAgo: 2, notes: 'Fuel & transit' },
  { type: 'expense', category: 'transport',     amount: 110.00,  monthsAgo: 3, notes: 'Fuel & transit' },
  { type: 'expense', category: 'utilities',     amount: 145.00,  monthsAgo: 0, notes: 'Electricity & internet' },
  { type: 'expense', category: 'utilities',     amount: 132.50,  monthsAgo: 1, notes: 'Electricity & internet' },
  { type: 'expense', category: 'utilities',     amount: 158.75,  monthsAgo: 2, notes: 'Electricity & internet' },
  { type: 'expense', category: 'utilities',     amount: 140.00,  monthsAgo: 3, notes: 'Electricity & internet' },
  { type: 'expense', category: 'healthcare',    amount: 250.00,  monthsAgo: 1, notes: 'Doctor visit & meds' },
  { type: 'expense', category: 'healthcare',    amount: 80.00,   monthsAgo: 4, notes: 'Pharmacy' },
  { type: 'expense', category: 'entertainment', amount: 60.00,   monthsAgo: 0, notes: 'Streaming & movies' },
  { type: 'expense', category: 'entertainment', amount: 75.50,   monthsAgo: 2, notes: 'Streaming & movies' },
  { type: 'expense', category: 'entertainment', amount: 90.00,   monthsAgo: 4, notes: 'Concert tickets' },
  { type: 'expense', category: 'other',         amount: 200.00,  monthsAgo: 1, notes: 'Miscellaneous' },
  { type: 'expense', category: 'other',         amount: 150.00,  monthsAgo: 3, notes: 'Miscellaneous' },
  { type: 'expense', category: 'transport',     amount: 75.00,   monthsAgo: 4, notes: 'Parking fees' },
  { type: 'expense', category: 'utilities',     amount: 125.00,  monthsAgo: 4, notes: 'Water bill' },
  { type: 'expense', category: 'food',          amount: 55.00,   monthsAgo: 5, notes: 'Restaurant' },
];

function dateForMonth(monthsAgo: number, day: number): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - monthsAgo, day);
}

async function main() {
  console.log('Seeding database...');

  await prisma.financialRecord.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const hash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

  const [admin, analyst, viewer] = await Promise.all([
    prisma.user.create({
      data: { name: 'Admin User', email: 'admin@finledger.com', passwordHash: hash, role: 'admin', emailVerified: true },
    }),
    prisma.user.create({
      data: { name: 'Analyst User', email: 'analyst@finledger.com', passwordHash: hash, role: 'analyst', emailVerified: true },
    }),
    prisma.user.create({
      data: { name: 'Viewer User', email: 'viewer@finledger.com', passwordHash: hash, role: 'viewer', emailVerified: true },
    }),
  ]);

  console.log(`Created users:`);
  console.log(`  admin@finledger.com    (role: admin)`);
  console.log(`  analyst@finledger.com  (role: analyst)`);
  console.log(`  viewer@finledger.com   (role: viewer)`);
  console.log(`  password: ${PASSWORD}`);

  const users = [admin, analyst, viewer];

  const records = RECORD_PLAN.map((r, i) => ({
    userId: users[i % 3].id,
    amount: r.amount,
    type: r.type,
    category: r.category,
    date: dateForMonth(r.monthsAgo, 5 + (i % 20)), // spread days 5–24
    notes: r.notes,
  }));

  await prisma.financialRecord.createMany({ data: records });

  console.log(`Created ${records.length} financial records across 6 months`);
  console.log('Seed complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

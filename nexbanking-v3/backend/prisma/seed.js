/**
 * Development-only seed script.
 * Demo credentials are for LOCAL DEVELOPMENT — never use these in production.
 *
 * Demo users:
 *   user@nexbanking.dev  / UserPass1!  / PIN 2468
 *   admin@nexbanking.dev / AdminPass1! / PIN 1357
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding development data...');

  const userPass = await bcrypt.hash('UserPass1!', 12);
  const adminPass = await bcrypt.hash('AdminPass1!', 12);
  const userPin = await bcrypt.hash('2468', 12);
  const adminPin = await bcrypt.hash('1357', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@nexbanking.dev' },
    update: {},
    create: {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@nexbanking.dev',
      password: adminPass,
      role: 'admin',
      phone: '+10000000000',
      transactionPinHash: adminPin,
      account: {
        create: {
          accountNumber: 'NEX1000000001',
          accountType: 'savings',
          balance: 50000,
          totalDeposited: 50000,
        },
      },
    },
  });

  const demo = await prisma.user.upsert({
    where: { email: 'user@nexbanking.dev' },
    update: {},
    create: {
      firstName: 'Demo',
      lastName: 'Customer',
      email: 'user@nexbanking.dev',
      password: userPass,
      role: 'user',
      phone: '+10000000001',
      transactionPinHash: userPin,
      account: {
        create: {
          accountNumber: 'NEX2000000002',
          accountType: 'savings',
          balance: 2500,
          totalDeposited: 2500,
        },
      },
    },
  });

  const demoAccount = await prisma.account.findUnique({ where: { userId: demo.id } });

  if (demoAccount) {
    await prisma.beneficiary.upsert({
      where: {
        userId_accountNumber: {
          userId: demo.id,
          accountNumber: 'NEX1000000001',
        },
      },
      update: {},
      create: {
        userId: demo.id,
        name: 'Admin User',
        accountNumber: 'NEX1000000001',
        nickname: 'Admin',
        isFavorite: true,
      },
    });
  }

  console.log('✅ Seed complete (development only)');
  console.log('   Demo user:  user@nexbanking.dev / UserPass1!  (PIN: 2468)');
  console.log('   Demo admin: admin@nexbanking.dev / AdminPass1! (PIN: 1357)');
  console.log(`   Admin id: ${admin.id}`);
  console.log(`   User id:  ${demo.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

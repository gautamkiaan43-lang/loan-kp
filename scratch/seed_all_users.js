/**
 * seed_all_users.js
 * Adds 2 realistic ACTIVE+CLOSED loans with full installment history
 * for ALL employee users (1, 8, 9) so whoever logs in sees data.
 *
 * Run: node scratch/seed_all_users.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

const USERS = [
  { id: 1,  email: 'employee@lms.demo', name: 'Employee user demo', company: 'LMS Financial' },
  { id: 8,  email: 'test@gmail.com',     name: 'test1',              company: 'gtgtfdfd'      },
  { id: 9,  email: 'koi@gmail.com',      name: 'koi',               company: 'test'          },
];

async function seedForUser(user) {
  console.log(`\n👤 Seeding for ${user.email} (id=${user.id})...`);

  /* ─── LOAN 1: R5,000 ACTIVE — 3 paid / 3 pending ─── */
  const ref1   = `STMT-${user.id}-L1`;
  const start1 = new Date('2025-11-01');

  const exist1 = await prisma.loan.findFirst({ where: { reference: ref1 } });
  if (exist1) {
    console.log(`  ⚠  ${ref1} already exists — skip`);
  } else {
    const loan1 = await prisma.loan.create({
      data: {
        reference:     ref1,
        amount:        5000,
        status:        'ACTIVE',
        stage:         'ACTIVE',
        userId:        user.id,
        company:       user.company,
        employeeEmail: user.email,
        employeeName:  user.name,
        createdAt:     start1,
        metadata: {
          loanRequest:   { term: '6' },
          financialInfo: { grossIncome: 8000, expenses: 3000 }
        }
      }
    });

    const insts1 = [];
    for (let m = 1; m <= 6; m++) {
      const isPaid = m <= 3;
      insts1.push({
        reference:  `${ref1}-M${m}`,
        amount:     897.44,
        paidAmount: isPaid ? 897.44 : 0,
        status:     isPaid ? 'PAID' : 'PENDING',
        dueDate:    addMonths(start1, m),
        loanId:     loan1.id
      });
    }
    await prisma.installment.createMany({ data: insts1 });
    console.log(`  ✅ Loan 1 created: ${ref1} | R5,000 | 3 PAID + 3 PENDING`);
  }

  /* ─── LOAN 2: R2,400 CLOSED — all 6 paid ─── */
  const ref2   = `STMT-${user.id}-L2`;
  const start2 = new Date('2024-07-01');

  const exist2 = await prisma.loan.findFirst({ where: { reference: ref2 } });
  if (exist2) {
    console.log(`  ⚠  ${ref2} already exists — skip`);
  } else {
    const loan2 = await prisma.loan.create({
      data: {
        reference:     ref2,
        amount:        2400,
        status:        'CLOSED',
        stage:         'CLOSED',
        userId:        user.id,
        company:       user.company,
        employeeEmail: user.email,
        employeeName:  user.name,
        createdAt:     start2,
        metadata: {
          loanRequest:   { term: '6' },
          financialInfo: { grossIncome: 8000, expenses: 3000 }
        }
      }
    });

    const insts2 = [];
    for (let m = 1; m <= 6; m++) {
      insts2.push({
        reference:  `${ref2}-M${m}`,
        amount:     447.83,
        paidAmount: 447.83,
        status:     'PAID',
        dueDate:    addMonths(start2, m),
        loanId:     loan2.id
      });
    }
    await prisma.installment.createMany({ data: insts2 });
    console.log(`  ✅ Loan 2 created: ${ref2} | R2,400 | 6/6 PAID (CLOSED)`);
  }

  /* ─── LOAN 3: R8,000 ACTIVE — 1 paid / 5 pending ─── */
  const ref3   = `STMT-${user.id}-L3`;
  const start3 = new Date('2026-01-15');

  const exist3 = await prisma.loan.findFirst({ where: { reference: ref3 } });
  if (exist3) {
    console.log(`  ⚠  ${ref3} already exists — skip`);
  } else {
    const loan3 = await prisma.loan.create({
      data: {
        reference:     ref3,
        amount:        8000,
        status:        'ACTIVE',
        stage:         'ACTIVE',
        userId:        user.id,
        company:       user.company,
        employeeEmail: user.email,
        employeeName:  user.name,
        createdAt:     start3,
        metadata: {
          loanRequest:   { term: '6' },
          financialInfo: { grossIncome: 12000, expenses: 4000 }
        }
      }
    });

    const insts3 = [];
    for (let m = 1; m <= 6; m++) {
      const isPaid = m === 1;
      insts3.push({
        reference:  `${ref3}-M${m}`,
        amount:     1536.67,
        paidAmount: isPaid ? 1536.67 : 0,
        status:     isPaid ? 'PAID' : 'PENDING',
        dueDate:    addMonths(start3, m),
        loanId:     loan3.id
      });
    }
    await prisma.installment.createMany({ data: insts3 });
    console.log(`  ✅ Loan 3 created: ${ref3} | R8,000 | 1 PAID + 5 PENDING`);
  }
}

async function main() {
  console.log('🌱 Seeding statement test data for all employee users...');

  for (const user of USERS) {
    await seedForUser(user);
  }

  console.log('\n\n🎉 All done! Open the Statements page to verify.');
}

main()
  .catch(e => { console.error('❌ Error:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());

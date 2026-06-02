/**
 * seed_statements.js
 * Adds 2 realistic test loans with full repayment installment history
 * to userId=1 (employee@lms.demo) for testing the Statements page.
 *
 * Loan A: R5,000 over 6 months — 3 paid, 3 pending  (ACTIVE)
 * Loan B: R2,400 over 6 months — all 6 paid          (CLOSED)
 *
 * Run: node scratch/seed_statements.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const USER_ID = 1; // employee@lms.demo

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

async function main() {
  console.log('🌱 Seeding test statement data...\n');

  /* ── LOAN A: R5,000 — partially repaid (3/6 paid) ── */
  const loanARef   = 'LMS-TEST-5000';
  const loanAStart = new Date('2025-12-01');
  const loanAInstAmt = 897.44; // approx monthly repayment

  const existA = await prisma.loan.findFirst({ where: { reference: loanARef } });
  if (existA) {
    console.log(`⚠️  Loan ${loanARef} already exists — skipping.`);
  } else {
    const loanA = await prisma.loan.create({
      data: {
        reference:     loanARef,
        amount:        5000,
        status:        'ACTIVE',
        stage:         'ACTIVE',
        userId:        USER_ID,
        company:       'LMS Financial',
        employeeEmail: 'employee@lms.demo',
        employeeName:  'Employee user demo',
        createdAt:     loanAStart,
        metadata: {
          loanRequest:   { term: '6' },
          financialInfo: { grossIncome: 8000, expenses: 3000 }
        }
      }
    });

    const installmentsA = [];
    for (let m = 1; m <= 6; m++) {
      installmentsA.push({
        reference: `INST-${loanARef}-M${m}`,
        amount:    loanAInstAmt,
        paidAmount: m <= 3 ? loanAInstAmt : 0,
        status:    m <= 3 ? 'PAID' : 'PENDING',
        dueDate:   addMonths(loanAStart, m),
        loanId:    loanA.id
      });
    }

    await prisma.installment.createMany({ data: installmentsA });
    console.log(`✅ Loan A created: ${loanARef} | R5,000 | 3 PAID + 3 PENDING installments`);
  }

  /* ── LOAN B: R2,400 — fully repaid (6/6 paid) ── */
  const loanBRef   = 'LMS-TEST-2400';
  const loanBStart = new Date('2025-01-01');
  const loanBInstAmt = 447.83; // approx monthly repayment

  const existB = await prisma.loan.findFirst({ where: { reference: loanBRef } });
  if (existB) {
    console.log(`⚠️  Loan ${loanBRef} already exists — skipping.`);
  } else {
    const loanB = await prisma.loan.create({
      data: {
        reference:     loanBRef,
        amount:        2400,
        status:        'CLOSED',
        stage:         'CLOSED',
        userId:        USER_ID,
        company:       'LMS Financial',
        employeeEmail: 'employee@lms.demo',
        employeeName:  'Employee user demo',
        createdAt:     loanBStart,
        metadata: {
          loanRequest:   { term: '6' },
          financialInfo: { grossIncome: 8000, expenses: 3000 }
        }
      }
    });

    const installmentsB = [];
    for (let m = 1; m <= 6; m++) {
      installmentsB.push({
        reference: `INST-${loanBRef}-M${m}`,
        amount:    loanBInstAmt,
        paidAmount: loanBInstAmt,
        status:    'PAID',
        dueDate:   addMonths(loanBStart, m),
        loanId:    loanB.id
      });
    }

    await prisma.installment.createMany({ data: installmentsB });
    console.log(`✅ Loan B created: ${loanBRef} | R2,400 | 6/6 PAID (CLOSED)`);
  }

  console.log('\n🎉 Done! Now open the Statements page to verify.');
}

main()
  .catch(e => { console.error('❌ Error:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());

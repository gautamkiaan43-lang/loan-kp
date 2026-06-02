/**
 * Simulates exactly what the /api/employee/statements endpoint returns
 * for each user — to confirm the per-loan structure is correct.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simulateStatements(userId) {
  const loans = await prisma.loan.findMany({
    where: { userId },
    include: { installment: { orderBy: { dueDate: 'asc' } } },
    orderBy: { createdAt: 'desc' }
  });

  const loanStatements = loans.map(loan => {
    const statusUpper = (loan.status || '').toUpperCase();
    const stageUpper  = (loan.stage  || '').toUpperCase();
    const isDisbursed = ['ACTIVE','DISBURSED','PAID','CLOSED'].includes(statusUpper)
                     || ['ACTIVE','DISBURSED','PAID','CLOSED'].includes(stageUpper);

    const totalDisbursed = isDisbursed ? loan.amount : 0;
    const totalRepaid = loan.installment
      .filter(i => ['PAID','RECEIVED','COMPLETED'].includes((i.status||'').toUpperCase()))
      .reduce((s,i) => s + i.amount, 0);
    const balance = Math.max(0, totalDisbursed - totalRepaid);
    const pending = loan.installment.filter(i => (i.status||'').toUpperCase() === 'PENDING');
    const nextInst = pending[0] || null;

    const txCount = (isDisbursed ? 1 : 0) + loan.installment.length;

    return {
      ref: loan.reference,
      amount: loan.amount,
      status: loan.status,
      isDisbursed,
      totalRepaid: totalRepaid.toFixed(2),
      balance: balance.toFixed(2),
      nextPayment: nextInst ? `R${nextInst.amount.toFixed(2)} due ${new Date(nextInst.dueDate).toLocaleDateString('en-GB')}` : 'N/A',
      txCount
    };
  });

  return loanStatements;
}

async function main() {
  const users = [
    { id: 1, email: 'employee@lms.demo' },
    { id: 8, email: 'test@gmail.com' },
    { id: 9, email: 'koi@gmail.com' },
  ];

  for (const u of users) {
    const stmts = await simulateStatements(u.id);
    const withTx = stmts.filter(s => s.txCount > 0);
    console.log(`\n👤 ${u.email}:`);
    console.log(`   Total loans: ${stmts.length}  |  With transactions: ${withTx.length}`);
    withTx.forEach(s => {
      console.log(`   ✅ ${s.ref} | R${s.amount} | ${s.status} | Repaid:R${s.totalRepaid} | Balance:R${s.balance} | NextPay:${s.nextPayment} | TxCount:${s.txCount}`);
    });
    if (withTx.length === 0) console.log('   ❌ No disbursed loans with transactions!');
  }
}

main().finally(() => prisma.$disconnect());

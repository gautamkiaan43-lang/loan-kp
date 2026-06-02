/**
 * Quick test: simulate what getStatements returns for userId=1
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userId = 1;

  const loans = await prisma.loan.findMany({
    where: { userId },
    include: { installment: { orderBy: { dueDate: 'asc' } } },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`\n=== ${loans.length} total loans for userId=${userId} ===\n`);

  loans.forEach(loan => {
    const statusUpper = (loan.status || '').toUpperCase();
    const stageUpper  = (loan.stage  || '').toUpperCase();
    const isDisbursed = ['ACTIVE','DISBURSED','PAID','CLOSED'].includes(statusUpper) ||
                        ['ACTIVE','DISBURSED','PAID','CLOSED'].includes(stageUpper);

    const totalDisbursed = isDisbursed ? loan.amount : 0;
    const totalRepaid = loan.installment
      .filter(i => ['PAID','RECEIVED','COMPLETED'].includes((i.status||'').toUpperCase()))
      .reduce((s, i) => s + i.amount, 0);
    const balance = Math.max(0, totalDisbursed - totalRepaid);

    const pending = loan.installment.filter(i => (i.status||'').toUpperCase() === 'PENDING');
    const nextInst = pending.length > 0 ? pending[0] : null;

    console.log(`📋 ${loan.reference}`);
    console.log(`   Amount:        R ${loan.amount}`);
    console.log(`   Status:        ${loan.status} / ${loan.stage}`);
    console.log(`   isDisbursed:   ${isDisbursed}`);
    console.log(`   Total Repaid:  R ${totalRepaid.toFixed(2)}`);
    console.log(`   Balance Owing: R ${balance.toFixed(2)}`);
    console.log(`   Installments:  ${loan.installment.length} (${pending.length} pending)`);
    console.log(`   Next Payment:  ${nextInst ? `R${nextInst.amount} due ${new Date(nextInst.dueDate).toLocaleDateString()}` : 'N/A'}`);
    console.log('');
  });
}

main().finally(() => prisma.$disconnect());

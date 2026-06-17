// compute_stats.js
// Usage: node compute_stats.js <employeeId>
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  let employeeId = process.argv[2];
  if (!employeeId) {
    // Auto-detect the employee with the most loans (likely the one with 20 loans)
    const allLoans = await prisma.loan.findMany({ select: { userId: true } });
    const counts = {};
    allLoans.forEach(l => {
      counts[l.userId] = (counts[l.userId] || 0) + 1;
    });
    const topUserId = Object.entries(counts).reduce((best, cur) =>
      cur[1] > best[1] ? cur : best, [null, 0])[0];
    if (!topUserId) {
      console.error('No loans found in the system');
      process.exit(1);
    }
    employeeId = topUserId.toString();
    console.log('▶ Auto‑detected employeeId:', employeeId);
  }
  const loans = await prisma.loan.findMany({
    where: { userId: Number(employeeId) },
    include: { installment: { orderBy: { dueDate: 'asc' } } },
    orderBy: { createdAt: 'desc' }
  });

  let grandTotalDisbursed = 0;
  let grandTotalRepaid = 0;
  const breakdown = [];

  loans.forEach(loan => {
    const statusUpper = (loan.status || '').toUpperCase();
    const stageUpper = (loan.stage || '').toUpperCase();
    const isDisbursed = ['ACTIVE','DISBURSED','PAID'].some(x => statusUpper.includes(x)) ||
                       ['ACTIVE','DISBURSED','PAID'].some(x => stageUpper.includes(x));
    const totalDisbursed = isDisbursed ? loan.amount : 0;
    const totalRepaid = loan.installment
      .filter(i => ['PAID','RECEIVED','COMPLETED'].includes((i.status||'').toUpperCase()))
      .reduce((s,i) => s + i.amount, 0);
    const balance = Math.max(0, totalDisbursed - totalRepaid);
    if (isDisbursed) {
      grandTotalDisbursed += totalDisbursed;
      grandTotalRepaid += totalRepaid;
    }
    breakdown.push({
      loanId: loan.id,
      reference: loan.reference,
      amount: loan.amount,
      isDisbursed,
      totalDisbursed,
      totalRepaid,
      balance
    });
  });

  const outstandingBalance = Math.max(0, grandTotalDisbursed - grandTotalRepaid);
  console.log(JSON.stringify({
    totalLoans: loans.length,
    totalDisbursed: grandTotalDisbursed,
    totalRepaid: grandTotalRepaid,
    outstandingBalance,
    breakdown
  }, null, 2));
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });

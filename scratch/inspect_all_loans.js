const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { calculateOutstandingBalance, calculateSettlementAmount } = require('../utils/settlementCalculator');

async function main() {
  const loans = await prisma.loan.findMany({
    include: { installment: true }
  });
  console.log(`--- ALL LOANS (${loans.length}) ---`);
  for (const l of loans) {
    const balance = calculateOutstandingBalance(l);
    const settlement = calculateSettlementAmount(l);
    console.log(`ID: ${l.id} | Ref: ${l.reference} | UserID: ${l.userId} | Amt: ${l.amount} | Status: ${l.status} | Stage: ${l.stage} | Bal: ${balance} | Settle: ${settlement}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

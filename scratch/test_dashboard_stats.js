const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { calculateOutstandingBalance, calculateSettlementAmount } = require('../utils/settlementCalculator');

async function main() {
  const userId = 1;
  const loans = await prisma.loan.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  const activeLoan = await prisma.loan.findFirst({
    where: {
      userId,
      OR: [
        { status: { in: ['active', 'disbursed', 'ACTIVE', 'DISBURSED'] } },
        { stage: { in: ['active', 'ACTIVE'] } }
      ]
    },
    include: {
      installment: true,
      interest_allocations: true,
      service_fee_allocations: true
    }
  });

  let balance = 0;
  if (activeLoan) {
    balance = calculateOutstandingBalance(activeLoan);
  }

  const currentSettlementAmount = calculateSettlementAmount(activeLoan);

  console.log("Active Loan ID:", activeLoan ? activeLoan.id : "None");
  console.log("Raw Balance:", balance);
  console.log("Formatted Balance:", `R ${balance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`);
  console.log("Raw Settlement Amount:", currentSettlementAmount);
  console.log("Formatted Settlement Amount:", `R ${currentSettlementAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());

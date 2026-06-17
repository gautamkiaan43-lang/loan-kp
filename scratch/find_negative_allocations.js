const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { calculateOutstandingBalance, calculateUnearnedCharges, calculateSettlementAmount } = require('../utils/settlementCalculator');

async function main() {
  const loans = await prisma.loan.findMany({
    include: {
      installment: true,
      interest_allocations: true,
      service_fee_allocations: true
    }
  });

  console.log(`Checking ${loans.length} loans for negative allocations or unusual math...`);
  for (const loan of loans) {
    const outstanding = calculateOutstandingBalance(loan);
    const unearned = calculateUnearnedCharges(loan, new Date('2026-06-17'));
    const saving = unearned.unearnedInterest + unearned.unearnedServiceFees;
    const settlement = calculateSettlementAmount(loan, new Date('2026-06-17'));

    if (saving < 0 || Math.abs(settlement - (outstanding - saving)) > 1.0) {
      console.log(`Unusual loan: Ref: ${loan.reference}`);
      console.log(`  Outstanding: ${outstanding}`);
      console.log(`  Unearned Interest: ${unearned.unearnedInterest}`);
      console.log(`  Unearned SF: ${unearned.unearnedServiceFees}`);
      console.log(`  Saving: ${saving}`);
      console.log(`  Settlement: ${settlement}`);
    }
    
    // Check allocations directly
    loan.interest_allocations.forEach(a => {
      if (a.amount < 0) console.log(`Negative interest alloc on loan ${loan.reference}: ${a.amount}`);
    });
    loan.service_fee_allocations.forEach(a => {
      if (a.amount < 0) console.log(`Negative service fee alloc on loan ${loan.reference}: ${a.amount}`);
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

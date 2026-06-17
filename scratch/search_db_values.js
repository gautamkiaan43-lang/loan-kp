const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Let's find all active/disbursed loans and print their details:
  // we want to see if any loan has an outstanding balance of 12293.36 or totalRepayment of 15366.67 or settlement of 12908
  const loans = await prisma.loan.findMany({
    include: {
      installment: true,
      interest_allocations: true,
      service_fee_allocations: true
    }
  });

  console.log(`Searching through ${loans.length} loans...`);
  
  const { calculateOutstandingBalance, calculateUnearnedCharges, calculateSettlementAmount } = require('../utils/settlementCalculator');

  for (const loan of loans) {
    const outstanding = calculateOutstandingBalance(loan);
    const { unearnedInterest, unearnedServiceFees } = calculateUnearnedCharges(loan, new Date('2026-06-17'));
    const saving = unearnedInterest + unearnedServiceFees;
    const settlement = calculateSettlementAmount(loan, new Date('2026-06-17'));

    // We can also check if the loan has installments matching the values
    const hasMatch = 
      Math.abs(outstanding - 12293.36) < 5.0 || 
      Math.abs(settlement - 12908) < 5.0 ||
      loan.amount === 12000 || loan.amount === 12500 || loan.amount === 13000;

    if (hasMatch) {
      console.log(`\nMATCH FOUND: Loan Ref: ${loan.reference}, User: ${loan.employeeName}`);
      console.log(`  Principal: R ${loan.amount}`);
      console.log(`  Status: ${loan.status}, Stage: ${loan.stage}`);
      console.log(`  Outstanding (2026-06-17): R ${outstanding}`);
      console.log(`  Saving (2026-06-17): R ${saving} (Interest: ${unearnedInterest}, SF: ${unearnedServiceFees})`);
      console.log(`  Settlement (2026-06-17): R ${settlement}`);
      console.log(`  Installments:`);
      loan.installment.forEach(i => {
        console.log(`    Due: ${i.dueDate.toISOString().split('T')[0]}, Amt: ${i.amount}, Paid: ${i.paidAmount}, Status: ${i.status}`);
      });
      console.log(`  Interest Allocations:`);
      loan.interest_allocations.forEach(ia => {
        console.log(`    Due: ${ia.dueDate.toISOString().split('T')[0]}, Amt: ${ia.amount}, Status: ${ia.status}`);
      });
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

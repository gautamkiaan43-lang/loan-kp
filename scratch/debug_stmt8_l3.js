const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { calculateOutstandingBalance, calculateUnearnedCharges, calculateSettlementAmount, calculateEarlySettlement } = require('../utils/settlementCalculator');

async function main() {
  const loan = await prisma.loan.findFirst({
    where: { reference: 'STMT-8-L3' },
    include: {
      installment: true,
      interest_allocations: true,
      service_fee_allocations: true
    }
  });

  if (!loan) {
    console.log("STMT-8-L3 not found");
    return;
  }

  // Let's run the calculator functions step by step with a fake "now" date if needed
  // We want to see how we can get outstanding = 12293.36, settlement = 12908, pipeline = 15366.67
  // Let's print out all allocations and installments in detail
  console.log(`Loan ID: ${loan.id}, Ref: ${loan.reference}, Amount: ${loan.amount}`);
  console.log(`Outstanding Balance (code): R ${calculateOutstandingBalance(loan)}`);
  
  const unearned = calculateUnearnedCharges(loan, new Date('2026-06-17'));
  console.log(`Unearned Interest: R ${unearned.unearnedInterest}`);
  console.log(`Unearned Service Fees: R ${unearned.unearnedServiceFees}`);
  console.log(`Settlement Saving: R ${unearned.unearnedInterest + unearned.unearnedServiceFees}`);
  console.log(`Settlement Amount (code): R ${calculateSettlementAmount(loan, new Date('2026-06-17'))}`);

  console.log("\nInterest Allocations:");
  loan.interest_allocations.forEach(a => {
    console.log(`  ID: ${a.id}, Due: ${a.dueDate.toISOString().split('T')[0]}, Amount: ${a.amount}, Status: ${a.status}`);
  });

  console.log("\nService Fee Allocations:");
  loan.service_fee_allocations.forEach(a => {
    console.log(`  ID: ${a.id}, Due: ${a.dueDate.toISOString().split('T')[0]}, Amount: ${a.amount}, Status: ${a.status}`);
  });

  console.log("\nInstallments:");
  loan.installment.forEach(a => {
    console.log(`  ID: ${a.id}, Due: ${a.dueDate.toISOString().split('T')[0]}, Amount: ${a.amount}, PaidAmount: ${a.paidAmount}, Status: ${a.status}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());

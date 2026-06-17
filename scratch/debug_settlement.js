// debug_settlement.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { calculateEarlySettlement } = require('../utils/settlementCalculator');

(async () => {
  const loanRef = 'STMT-1-L3'; // example loan reference
  const loan = await prisma.loan.findFirst({
    where: { reference: loanRef },
    include: {
      installment: true,
      interest_allocations: true,
      service_fee_allocations: true
    }
  });
  if (!loan) {
    console.error('Loan not found:', loanRef);
    process.exit(1);
  }
  const now = new Date('2026-06-17T00:00:00Z'); // calculation date
  const result = await calculateEarlySettlement(loan, false, now);
  console.log('--- Settlement Calculation Debug ---');
  console.log('Actual Balance (outstandingBalance):', result.outstandingBalance);
  console.log('Unearned Interest:', result.unearnedInterest);
  console.log('Unearned Service Fees:', result.unearnedServiceFees);
  console.log('Settlement Saving (interest + fees):', result.settlementSaving);
  console.log('Pipeline Deduction:', result.pipelineDeduction);
  console.log('Settlement Amount (backend):', result.settlementAmount);
  // Frontend multiplier demonstration
  const frontEndSettlement = Math.round(result.outstandingBalance * 1.05);
  console.log('Settlement Amount (frontend multiplier 1.05):', frontEndSettlement);
  await prisma.$disconnect();
})();

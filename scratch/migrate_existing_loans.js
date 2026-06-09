const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getLoanMatrixValues } = require('../utils/settlementCalculator');

const generateDueDates = (frequency, termMonths, disbursementDate = new Date()) => {
  const dates = [];
  const start = new Date(disbursementDate);
  const day = start.getDate();
  
  let totalInstallments = termMonths;
  
  if (frequency === 'Weekly') {
    totalInstallments = termMonths * 4;
    for (let i = 1; i <= totalInstallments; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + (7 * i));
      dates.push(d);
    }
  } else if (frequency === 'Fortnightly') {
    totalInstallments = termMonths * 2;
    for (let i = 1; i <= totalInstallments; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + (14 * i));
      dates.push(d);
    }
  } else { // Monthly
    totalInstallments = termMonths;
    let targetMonth = start.getMonth();
    let targetYear = start.getFullYear();
    
    if (day > 8) {
      targetMonth += 1;
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear += 1;
      }
    }
    
    for (let i = 0; i < totalInstallments; i++) {
      const d = new Date(targetYear, targetMonth + i, 25);
      dates.push(d);
    }
  }
  return dates;
};

async function main() {
  console.log('--- STARTING ALLOCATIONS MIGRATION FOR HISTORICAL LOANS ---');
  const now = new Date();

  // Query all loans in the database
  const loans = await prisma.loan.findMany({
    include: {
      installment: { orderBy: { dueDate: 'asc' } },
      interest_allocations: true,
      service_fee_allocations: true
    }
  });

  console.log(`Found ${loans.length} total loans in database.`);
  let migratedCount = 0;

  for (const loan of loans) {
    // Check if the loan already has allocations
    if (loan.interest_allocations.length > 0 || loan.service_fee_allocations.length > 0) {
      console.log(`Skipping Loan ID: ${loan.id} (Ref: ${loan.reference}) - Allocations already exist.`);
      continue;
    }

    console.log(`Migrating Loan ID: ${loan.id} (Ref: ${loan.reference}) | Status: ${loan.status} | Stage: ${loan.stage}`);

    // Parse metadata
    let term = 6;
    let frequency = 'Monthly';
    if (loan.metadata) {
      try {
        const meta = typeof loan.metadata === 'string' ? JSON.parse(loan.metadata) : loan.metadata;
        if (meta.loanRequest?.term) {
          term = parseInt(meta.loanRequest.term) || 6;
        }
        if (meta.financialInfo?.salaryFrequency) {
          frequency = meta.financialInfo.salaryFrequency;
        }
      } catch (e) {
        // use default values
      }
    }

    // Get matrix values
    const matrixValues = getLoanMatrixValues(loan.amount, term);

    // Calculate count of installments
    const totalInstallmentsCount = loan.installment.length > 0
      ? loan.installment.length
      : (frequency === 'Weekly' ? (term * 4) : (frequency === 'Fortnightly' ? (term * 2) : term));

    const interestPerPeriod = matrixValues.interest / totalInstallmentsCount;
    const serviceFeePerPeriod = matrixValues.serviceFee / totalInstallmentsCount;

    // Use installment dates if available, otherwise generate
    const dueDates = loan.installment.length > 0
      ? loan.installment.map(inst => new Date(inst.dueDate))
      : generateDueDates(frequency, term, loan.createdAt);

    // Prepare allocation records
    const interestData = dueDates.map((date) => ({
      loanId: loan.id,
      dueDate: date,
      amount: Math.round(interestPerPeriod * 100) / 100,
      status: date <= now ? 'EARNED' : 'UNEARNED'
    }));

    const serviceFeeData = dueDates.map((date) => ({
      loanId: loan.id,
      dueDate: date,
      amount: Math.round(serviceFeePerPeriod * 100) / 100,
      status: date <= now ? 'EARNED' : 'UNEARNED'
    }));

    // Insert allocations in transaction
    await prisma.$transaction([
      prisma.interest_allocation.createMany({ data: interestData }),
      prisma.service_fee_allocation.createMany({ data: serviceFeeData })
    ]);

    console.log(`  Successfully generated ${dueDates.length} interest & service fee allocations.`);
    migratedCount++;
  }

  console.log(`\n--- MIGRATION COMPLETED: Migrated ${migratedCount} loans ---`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

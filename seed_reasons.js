const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const loans = await prisma.loan.findMany();
  console.log(`Found ${loans.length} loans`);

  const reasons = [
    'Debt Consolidation',
    'Medical Expenses',
    'School Fees',
    'Home Improvement',
    'Vehicle Repairs',
    'Personal Use',
    'Other'
  ];

  for (let i = 0; i < loans.length; i++) {
    const loan = loans[i];
    const reason = reasons[i % reasons.length];
    
    let metadata = {};
    if (loan.metadata) {
      if (typeof loan.metadata === 'string') {
        try {
          metadata = JSON.parse(loan.metadata);
        } catch (e) {}
      } else {
        metadata = loan.metadata;
      }
    }
    
    // Set purpose in multiple places just to be safe based on controller logic
    if (!metadata.loanRequest) metadata.loanRequest = {};
    metadata.loanRequest.loanReason = reason;
    metadata.purpose = reason;

    await prisma.loan.update({
      where: { id: loan.id },
      data: { metadata: JSON.stringify(metadata) }
    });
  }

  console.log('Updated loans with diverse reasons successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());

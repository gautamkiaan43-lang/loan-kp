const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const loans = await prisma.loan.findMany({
    where: {
      reference: { in: ['STMT-8-L3', 'STMT-9-L3'] }
    },
    include: {
      installment: true,
      interest_allocations: true,
      service_fee_allocations: true
    }
  });

  for (const loan of loans) {
    console.log(`\nLoan Ref: ${loan.reference}`);
    console.log(`Company: ${loan.company}`);
    console.log(`Amount: ${loan.amount}`);
    console.log(`Metadata:`, typeof loan.metadata === 'string' ? JSON.parse(loan.metadata) : loan.metadata);
    
    // Find the company config
    const company = await prisma.company.findFirst({
      where: { name: loan.company }
    });
    if (company) {
      console.log(`Company Config:`);
      console.log(`  Discount Amount: ${company.discountAmount}`);
      console.log(`  Discount Rate: ${company.discountRate}`);
      console.log(`  Commission Amount: ${company.commissionAmount}`);
      console.log(`  Kickback Rate: ${company.kickbackRate}`);
      console.log(`  employeeNumbers: ${company.employeeNumbers ? company.employeeNumbers.substring(0, 100) : 'none'}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

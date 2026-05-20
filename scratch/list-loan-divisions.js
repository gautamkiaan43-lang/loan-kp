const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const loans = await prisma.loan.findMany();
  for (const l of loans) {
    const meta = typeof l.metadata === 'string' ? JSON.parse(l.metadata) : l.metadata;
    console.log(`Loan Ref: ${l.reference} | Company: "${l.company}" | Employee: "${l.employeeName}"`);
    console.log(`  employerDivision:`, meta?.employmentInfo?.employerDivision);
  }
  await prisma.$disconnect();
}

check();

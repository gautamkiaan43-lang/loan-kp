const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const loan = await prisma.loan.findFirst({
    orderBy: { createdAt: 'desc' },
    where: {
      metadata: { not: null }
    }
  });
  console.log('--- LATEST LOAN METADATA ---');
  if (loan) {
    console.log('ID:', loan.id);
    console.log('Reference:', loan.reference);
    console.log('EmployeeName:', loan.employeeName);
    console.log('EmployeeEmail:', loan.employeeEmail);
    console.log('Metadata type:', typeof loan.metadata);
    console.log('Metadata:', JSON.stringify(loan.metadata, null, 2));
    console.log('DocumentUrls:', JSON.stringify(loan.documentUrls, null, 2));
  } else {
    console.log('No loans with metadata found.');
  }
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

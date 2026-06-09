const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLoans() {
  const loans = await prisma.loan.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  console.log("=== INSPECTING LOAN DOCUMENT_URLS AND METADATA ===");
  loans.forEach((loan, idx) => {
    console.log(`\nLoan ID: ${loan.id}, Reference: ${loan.reference}`);
    console.log(`Status: ${loan.status}, Stage: ${loan.stage}`);
    console.log("documentUrls:", JSON.stringify(loan.documentUrls));
    console.log("metadata:", JSON.stringify(loan.metadata));
  });

  await prisma.$disconnect();
}

checkLoans();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const loans = await prisma.loan.findMany({
    where: { userId: 1 },
    orderBy: { createdAt: 'desc' }
  });
  console.log(`User ID 1 has ${loans.length} loans.`);
  loans.forEach((l) => {
    console.log(`Loan ${l.id} (${l.reference}): Status: ${l.status}, Stage: ${l.stage}`);
    console.log(`documentUrls:`, JSON.stringify(l.documentUrls));
  });
  await prisma.$disconnect();
}

run();

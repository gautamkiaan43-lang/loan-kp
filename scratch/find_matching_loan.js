const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const loans = await prisma.loan.findMany({
    where: {
      OR: [
        { amount: 1200 },
        { status: { contains: 'closed' } },
        { stage: { contains: 'closed' } }
      ]
    }
  });
  console.log(`Found ${loans.length} matching loans:`);
  for (const l of loans) {
    console.log(`ID: ${l.id} | Ref: ${l.reference} | Name: ${l.employeeName} | Amount: ${l.amount} | Stage: ${l.stage} | Status: ${l.status}`);
    console.log('Metadata:', JSON.stringify(l.metadata, null, 2));
  }
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

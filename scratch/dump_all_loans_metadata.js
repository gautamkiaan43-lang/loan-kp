const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const loans = await prisma.loan.findMany({
    orderBy: { createdAt: 'desc' }
  });
  console.log('--- ALL LOANS METADATA ---');
  for (const l of loans) {
    console.log(`ID: ${l.id} | Ref: ${l.reference} | Name: ${l.employeeName} | Email: ${l.employeeEmail} | HasMetadata: ${!!l.metadata}`);
    if (l.metadata) {
      console.log('Keys:', Object.keys(l.metadata));
      console.log('Metadata:', JSON.stringify(l.metadata));
    }
  }
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

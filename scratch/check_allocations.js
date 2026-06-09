const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const loans = await prisma.loan.findMany({
    include: {
      interest_allocations: true,
      service_fee_allocations: true,
      installment: true
    }
  });
  console.log('--- ALL LOANS ALLOCATIONS ---');
  for (const l of loans) {
    console.log(`Loan ID: ${l.id} | Ref: ${l.reference} | Status: ${l.status}`);
    console.log(`  Installments count: ${l.installment.length}`);
    console.log(`  Interest allocations count: ${l.interest_allocations.length}`);
    console.log(`  Service fee allocations count: ${l.service_fee_allocations.length}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

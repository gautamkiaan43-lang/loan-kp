const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const loans = await prisma.loan.findMany({
    include: {
      installment: true,
      interest_allocations: true,
      service_fee_allocations: true
    }
  });
  console.log(`Found ${loans.length} loans:`);
  loans.forEach(l => {
    console.log(`Ref: ${l.reference}, ID: ${l.id}, Amount: ${l.amount}, Status: ${l.status}, Stage: ${l.stage}, User: ${l.employeeName} (${l.employeeEmail})`);
    console.log(`  Installments count: ${l.installment.length}`);
    console.log(`  Interest allocations count: ${l.interest_allocations.length}`);
    console.log(`  Service fee allocations count: ${l.service_fee_allocations.length}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());

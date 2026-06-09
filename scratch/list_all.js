const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const loans = await prisma.loan.findMany();
  console.log('LOANS IN DB:', loans.map(l => ({
    id: l.id,
    reference: l.reference,
    employeeEmail: l.employeeEmail,
    employeeName: l.employeeName,
    userId: l.userId,
    status: l.status,
    stage: l.stage
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());

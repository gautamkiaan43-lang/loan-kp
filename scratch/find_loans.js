const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const loans = await prisma.loan.findMany({
    include: { installment: true },
    orderBy: { createdAt: 'desc' }
  });
  loans.forEach(l => {
    console.log(`\nLoan #${l.id} | ${l.reference} | User:${l.userId} | R${l.amount} | Status:${l.status} | Stage:${l.stage}`);
    console.log(`  Installments: ${l.installment.length}`);
    l.installment.forEach(i => console.log(`    - INST#${i.id} R${i.amount} ${i.status} due:${new Date(i.dueDate).toLocaleDateString()}`));
  });
}

main().finally(() => prisma.$disconnect());

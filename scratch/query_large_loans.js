const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const loans = await prisma.loan.findMany({
    include: {
      installment: true,
      user: true
    }
  });
  console.log(`Total loans in database: ${loans.length}`);
  for (const loan of loans) {
    const pendingInstallments = loan.installment.filter(i => i.status === 'PENDING');
    const unpaidSum = pendingInstallments.reduce((sum, inst) => sum + Math.max(0, inst.amount - inst.paidAmount), 0);
    if (loan.amount > 15000 || unpaidSum > 15000) {
      console.log(`LARGE LOAN: ID: ${loan.id} | Ref: ${loan.reference} | User: ${loan.user.email} (${loan.user.name}) | Status: ${loan.status} | Stage: ${loan.stage} | Amount: R ${loan.amount} | Unpaid Installments: R ${unpaidSum}`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());

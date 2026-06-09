const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userId = 1;
  const loans = await prisma.loan.findMany({
    where: { userId },
    include: {
      installment: true
    }
  });
  console.log(`Loans for user ${userId}:`);
  for (const loan of loans) {
    console.log(`Loan ID: ${loan.id} | Ref: ${loan.reference} | Status: ${loan.status} | Stage: ${loan.stage} | Amount: R ${loan.amount}`);
    console.log(`Installments count: ${loan.installment.length}`);
    let totalInstallmentAmount = 0;
    loan.installment.forEach(inst => {
      totalInstallmentAmount += inst.amount;
      console.log(`  - Inst ID: ${inst.id} | Ref: ${inst.reference} | Amount: R ${inst.amount} | Paid: R ${inst.paidAmount} | Status: ${inst.status}`);
    });
    console.log(`Total installment amount: R ${totalInstallmentAmount}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());

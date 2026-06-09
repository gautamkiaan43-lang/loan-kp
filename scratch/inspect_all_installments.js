const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const installments = await prisma.installment.findMany({
    include: { loan: true }
  });
  console.log(`--- ALL INSTALLMENTS (${installments.length}) ---`);
  for (const inst of installments) {
    console.log(`ID: ${inst.id} | Ref: ${inst.reference} | LoanRef: ${inst.loan.reference} | Amt: ${inst.amount} | Paid: ${inst.paidAmount} | Status: ${inst.status} | LoanAmt: ${inst.loan.amount}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const loan = await prisma.loan.findFirst({
    where: { reference: 'STMT-8-L3' }
  });
  console.log("Raw Loan Row:", JSON.stringify(loan, null, 2));

  const insts = await prisma.installment.findMany({
    where: { loanId: loan.id }
  });
  console.log("Raw Installments:", JSON.stringify(insts, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());

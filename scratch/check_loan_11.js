const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLoan() {
  try {
    const loan = await prisma.loan.findUnique({
      where: { id: 23 },
      include: { installment: true }
    });
    console.log(JSON.stringify(loan, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLoan();

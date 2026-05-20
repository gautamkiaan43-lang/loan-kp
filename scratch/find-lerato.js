const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const loan = await prisma.loan.findFirst({
    where: { employeeName: 'Lerato Molefe' }
  });
  if (!loan) {
    console.log("No loan found for Lerato Molefe");
    return;
  }
  
  const user = await prisma.user.findUnique({
    where: { id: loan.userId }
  });
  
  console.log("Lerato Molefe's user account details:");
  console.log(user);
}

check();

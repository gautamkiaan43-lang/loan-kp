const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.user.findFirst({ where: { email: 'employee@lms.demo' } });
  if (!user) {
    console.log("No employee user found");
    return;
  }
  
  const latestLoan = await prisma.loan.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log("Latest loan for employee@lms.demo is:");
  console.log(latestLoan);
}

check();

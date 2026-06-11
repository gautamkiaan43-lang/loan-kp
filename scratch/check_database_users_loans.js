const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.log('--- LATEST 10 USERS ---');
  for (const user of users) {
    console.log(`ID: ${user.id} | Email: ${user.email} | Name: ${user.name} | Role: ${user.role} | Status: ${user.status}`);
  }
  
  const loans = await prisma.loan.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.log('--- LATEST 10 LOANS ---');
  for (const loan of loans) {
    console.log(`ID: ${loan.id} | Ref: ${loan.reference} | Email: ${loan.employeeEmail} | Name: ${loan.employeeName} | Company: ${loan.company}`);
  }
  
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

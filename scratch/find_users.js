const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, company: true },
    where: { role: 'employee' },
    take: 5
  });
  console.log(JSON.stringify(employees, null, 2));
}

main().finally(() => prisma.$disconnect());

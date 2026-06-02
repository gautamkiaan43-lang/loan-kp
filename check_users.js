const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ 
    select: { id: true, email: true, role: true, status: true, company: true } 
  });
  console.log(JSON.stringify(users, null, 2));
  await prisma.$disconnect();
}
main().catch(console.error);

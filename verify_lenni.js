const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const c = await prisma.company.findUnique({ where: { name: 'Lenni Global' } });
  console.log('Lenni Global:', JSON.stringify(c, null, 2));
}
main().finally(() => prisma.$disconnect());

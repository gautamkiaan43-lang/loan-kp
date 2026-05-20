const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const companies = await prisma.company.findMany();
  for (const c of companies) {
    console.log(`Company: "${c.name}"`);
    console.log(`  Divisions:`, c.divisions);
  }
  await prisma.$disconnect();
}

check();

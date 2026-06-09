const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany();
  console.log('Registered Companies and Credit Limits:');
  companies.forEach(c => {
    console.log(`- Company: ${c.name}, Credit Limit: "${c.creditLimit}"`);
  });
}

main()
  .catch(console.error)
  .finally(async () => await prisma.$disconnect());

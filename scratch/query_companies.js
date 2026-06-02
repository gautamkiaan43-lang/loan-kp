const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany({
    select: {
      id: true,
      name: true,
      employeeNumbers: true
    }
  });
  console.log('Companies and their Employee Numbers:');
  console.log(JSON.stringify(companies, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());

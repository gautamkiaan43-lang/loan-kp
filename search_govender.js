const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Searching database for Govender...');
  
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: 'Govender' } },
        { email: { contains: 'Govender' } }
      ]
    }
  });
  console.log('Users matching:', users);

  const companies = await prisma.company.findMany({
    where: {
      OR: [
        { authorized_signatory_name: { contains: 'Govender' } },
        { name: { contains: 'Govender' } }
      ]
    }
  });
  console.log('Companies matching:', companies);

  const loans = await prisma.loan.findMany({
    where: {
      OR: [
        { employeeName: { contains: 'Govender' } },
        { company: { contains: 'Govender' } }
      ]
    }
  });
  console.log('Loans matching:', loans);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MOCK_EMPLOYEES = {
  'Global Tech Solutions': ['GTS-1001', 'GTS-1002', 'GTS-1003'],
  'LMS Financial': ['LMS-2001', 'LMS-2002', 'LMS-2003'],
  'Acme Corp': ['ACME-3001', 'ACME-3002', 'ACME-3003'],
  'Stark Industries': ['STK-4001', 'STK-4002', 'STK-4003'],
  'TechFlow SA': ['TF-5001', 'TF-5002', 'TF-5003']
};

async function main() {
  console.log('Seeding company employee numbers in database...');

  for (const [companyName, employeeNumbers] of Object.entries(MOCK_EMPLOYEES)) {
    // Check if company exists
    const existing = await prisma.company.findUnique({
      where: { name: companyName }
    });

    const jsonValue = JSON.stringify(employeeNumbers);

    if (existing) {
      // Update
      await prisma.company.update({
        where: { id: existing.id },
        data: {
          employeeNumbers: jsonValue,
          approxTotalEmployees: employeeNumbers.length
        }
      });
      console.log(`Updated company "${companyName}" with employee numbers.`);
    } else {
      // Create
      await prisma.company.create({
        data: {
          name: companyName,
          status: 'Active',
          employeeNumbers: jsonValue,
          approxTotalEmployees: employeeNumbers.length,
          creditLimit: 'R 10M',
          divisions: JSON.stringify(['Engineering', 'Product', 'QA', 'Sales', 'Marketing', 'HR', 'Finance']),
          updatedAt: new Date()
        }
      });
      console.log(`Created company "${companyName}" with employee numbers.`);
    }
  }

  console.log('Company employee numbers seeded successfully!');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());

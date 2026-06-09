const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany();
  console.log('COMPANIES:', companies.map(c => ({
    id: c.id,
    name: c.name,
    authorized_signatory_email: c.authorized_signatory_email,
    authorizedSignatories: c.authorizedSignatories,
    contactPeople: c.contactPeople
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Checking database company configurations ---');
  const companies = await prisma.company.findMany();
  console.log(`Found ${companies.length} companies in the database.`);

  for (const comp of companies) {
    let needsUpdate = false;
    const updateData = {};

    // Check email
    if (comp.authorized_signatory_email && comp.authorized_signatory_email.includes('@lenni.com')) {
      updateData.authorized_signatory_email = comp.authorized_signatory_email.replace('@lenni.com', '@lenni.co.za');
      needsUpdate = true;
    } else if (!comp.authorized_signatory_email) {
      updateData.authorized_signatory_email = 'support@lenni.co.za';
      needsUpdate = true;
    }

    // Check phone
    if (comp.authorized_signatory_phone === '+27 12 345 6789' || !comp.authorized_signatory_phone) {
      updateData.authorized_signatory_phone = '+27 21 301 0274';
      needsUpdate = true;
    }

    if (needsUpdate) {
      console.log(`Updating company "${comp.name}":`, updateData);
      await prisma.company.update({
        where: { id: comp.id },
        data: updateData
      });
    } else {
      console.log(`Company "${comp.name}" is already up to date.`);
    }
  }
  console.log('--- Database checks and updates completed ---');
}

main()
  .catch(console.error)
  .finally(async () => await prisma.$disconnect());

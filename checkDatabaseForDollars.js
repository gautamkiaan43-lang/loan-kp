const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Searching database tables for dollar sign ($)...');

  // 1. Check companies
  const companies = await prisma.company.findMany();
  companies.forEach(c => {
    Object.keys(c).forEach(key => {
      const val = c[key];
      if (typeof val === 'string' && val.includes('$')) {
        console.log(`[COMPANY] ID=${c.id} Name=${c.name} Field=${key} has dollar: "${val}"`);
      }
    });
  });

  // 2. Check loans
  const loans = await prisma.loan.findMany();
  loans.forEach(l => {
    Object.keys(l).forEach(key => {
      const val = l[key];
      if (typeof val === 'string' && val.includes('$')) {
        console.log(`[LOAN] ID=${l.id} Ref=${l.reference} Field=${key} has dollar: "${val}"`);
      }
      if (key === 'metadata' && val) {
        const str = typeof val === 'string' ? val : JSON.stringify(val);
        if (str.includes('$')) {
          console.log(`[LOAN METADATA] ID=${l.id} Ref=${l.reference} has dollar inside metadata!`);
        }
      }
    });
  });

  // 3. Check installments
  const installments = await prisma.installment.findMany();
  installments.forEach(i => {
    Object.keys(i).forEach(key => {
      const val = i[key];
      if (typeof val === 'string' && val.includes('$')) {
        console.log(`[INSTALLMENT] ID=${i.id} Ref=${i.reference} Field=${key} has dollar: "${val}"`);
      }
    });
  });

  // 4. Check users
  const users = await prisma.user.findMany();
  users.forEach(u => {
    Object.keys(u).forEach(key => {
      const val = u[key];
      // Skip password field since it naturally contains $ for bcrypt hashes
      if (key !== 'password' && typeof val === 'string' && val.includes('$')) {
        console.log(`[USER] ID=${u.id} Email=${u.email} Field=${key} has dollar: "${val}"`);
      }
    });
  });

  console.log('Database scan finished.');
}

main()
  .catch(console.error)
  .finally(async () => await prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const loans = await prisma.loan.findMany({
    include: {
      user: true
    }
  });
  console.log(`TOTAL LOANS IN DB: ${loans.length}`);
  loans.forEach(l => {
    console.log(`ID: ${l.id} | Ref: ${l.reference} | User: ${l.user.email} | Status: ${l.status} | Stage: ${l.stage} | Amount: R ${l.amount}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());

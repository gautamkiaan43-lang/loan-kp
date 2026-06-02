const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Fixing seeded loans to populate documentUrls...");
  
  const mockDocs = {
    idDocument: "https://res.cloudinary.com/demo/image/upload/v1570979139/sample.jpg",
    latestPayslip: "https://res.cloudinary.com/demo/image/upload/v1570979139/sample.jpg",
    bankStatement: "https://res.cloudinary.com/demo/image/upload/v1570979139/sample.jpg",
    signature: "https://res.cloudinary.com/demo/image/upload/v1570979139/sample.jpg"
  };

  const loans = await prisma.loan.findMany();
  let count = 0;
  
  for (const loan of loans) {
    // If documents are missing or empty
    const docUrls = typeof loan.documentUrls === 'string' ? JSON.parse(loan.documentUrls) : (loan.documentUrls || {});
    if (!docUrls.latestPayslip || !docUrls.signature) {
      await prisma.loan.update({
        where: { id: loan.id },
        data: {
          documentUrls: mockDocs
        }
      });
      count++;
    }
  }
  
  console.log(`Successfully updated ${count} loans with mock document paths.`);
}

main()
  .catch(e => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

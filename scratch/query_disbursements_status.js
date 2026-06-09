const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== CHECKING DISBURSEMENT DATA IN DATABASE ===");
  try {
    const loans = await prisma.loan.findMany({
      select: {
        id: true,
        reference: true,
        status: true,
        stage: true,
        disbursementType: true,
        employeeName: true,
        amount: true
      }
    });

    console.log(`Total loans in database: ${loans.length}`);
    const summary = {};
    const details = [];
    
    for (const loan of loans) {
      const key = `${loan.stage} / ${loan.status} [${loan.disbursementType || 'Default/Null'}]`;
      summary[key] = (summary[key] || 0) + 1;
      details.push(loan);
    }

    console.log("\nSummary of loan states:");
    console.table(summary);

    console.log("\nDetailed loan list:");
    loans.forEach(l => {
      console.log(`- Ref: ${l.reference} | Name: ${l.employeeName} | Amt: R ${l.amount} | Stage: ${l.stage} | Status: ${l.status} | DisbType: ${l.disbursementType}`);
    });

  } catch (err) {
    console.error("Error running query:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

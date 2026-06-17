const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Fetching all settlement quotes from database...");
  if (prisma.settlement_quote) {
    const quotes = await prisma.settlement_quote.findMany({
      include: {
        loan: true
      }
    });
    console.log(`Found ${quotes.length} settlement quotes:`);
    for (const q of quotes) {
      console.log(`\nQuote Number: ${q.quoteNumber}`);
      console.log(`  Loan ID: ${q.loanId}, Ref: ${q.loan?.reference}`);
      console.log(`  Customer: ${q.customerName}`);
      console.log(`  Outstanding Balance: ${q.outstandingBalance}`);
      console.log(`  Unearned Interest: ${q.unearnedInterest}`);
      console.log(`  Unearned Service Fees: ${q.unearnedServiceFees}`);
      console.log(`  Pipeline Deduction: ${q.pipelineDeduction}`);
      console.log(`  Settlement Saving: ${q.settlementSaving}`);
      console.log(`  Settlement Amount: ${q.settlementAmount}`);
      console.log(`  Quote Date: ${q.quoteDate}`);
      console.log(`  Expiry Date: ${q.expiryDate}`);
      console.log(`  Status: ${q.status}`);
    }
  } else {
    console.log("No settlement_quote model in prisma");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

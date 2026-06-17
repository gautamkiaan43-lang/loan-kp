const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Searching database tables for values: 15366.67, 12293.36, 12908, 614.64");

  // 1. Search Loans
  const loans = await prisma.loan.findMany();
  for (const loan of loans) {
    const loanStr = JSON.stringify(loan);
    if (loanStr.includes("15366") || loanStr.includes("12293") || loanStr.includes("12908") || loanStr.includes("614")) {
      console.log(`Matched Loan ID: ${loan.id}, Ref: ${loan.reference}`);
      console.log(`  Amount: ${loan.amount}, Employee: ${loan.employeeName}`);
      console.log(`  Status: ${loan.status}, Stage: ${loan.stage}`);
      console.log(`  Metadata: ${loan.metadata}`);
    }
  }

  // 2. Search Installments
  const installments = await prisma.installment.findMany();
  for (const inst of installments) {
    if (Math.abs(inst.amount - 614.64) < 1.0 || Math.abs(inst.amount - 15366.67) < 1.0 || Math.abs(inst.amount - 12293.36) < 1.0) {
      console.log(`Matched Installment ID: ${inst.id}, LoanID: ${inst.loanId}, Amount: ${inst.amount}, Status: ${inst.status}, DueDate: ${inst.dueDate}`);
    }
  }

  // 3. Search Deductionschedule
  if (prisma.deductionschedule) {
    const schedules = await prisma.deductionschedule.findMany();
    console.log(`Found ${schedules.length} deduction schedules:`);
    for (const sch of schedules) {
      const schStr = JSON.stringify(sch);
      if (schStr.includes("15366") || schStr.includes("12293") || schStr.includes("12908") || schStr.includes("614")) {
        console.log(`Matched Deduction Schedule ID: ${sch.id}, Company: ${sch.company}, Period: ${sch.period}, TotalAmount: ${sch.totalAmount}`);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { calculateEarlySettlement } = require('../utils/settlementCalculator');

async function main() {
  const refs = ['STMT-8-L1', 'STMT-8-L3', 'STMT-9-L1', 'STMT-9-L3'];
  for (const ref of refs) {
    const loan = await prisma.loan.findFirst({
      where: { reference: ref },
      include: {
        installment: true,
        interest_allocations: true,
        service_fee_allocations: true
      }
    });
    if (loan) {
      const calc = await calculateEarlySettlement(loan, false, new Date());
      console.log(`\nLoan: ${ref}`);
      console.log(`Outstanding: R ${calc.outstandingBalance}`);
      console.log(`Saving: R ${calc.settlementSaving}`);
      console.log(`Settlement: R ${calc.settlementAmount}`);
      console.log(`Installments:`);
      loan.installment.forEach(i => {
        console.log(`  - Due: ${i.dueDate.toISOString().split('T')[0]}, Amt: ${i.amount}, Paid: ${i.paidAmount}, Status: ${i.status}`);
      });
    } else {
      console.log(`Loan ${ref} not found`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

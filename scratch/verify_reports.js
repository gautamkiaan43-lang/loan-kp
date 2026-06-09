const prisma = require('../config/db');
const { calculateOutstandingBalance, calculateSettlementAmount, getLoanMatrixValues } = require('../utils/settlementCalculator');

async function main() {
  console.log("Fetching loans with status ACTIVE or DISBURSED...");
  const loans = await prisma.loan.findMany({
    where: {
      status: { in: ['Active', 'ACTIVE', 'Disbursed', 'DISBURSED'] }
    },
    include: { installment: true }
  });

  console.log(`Found ${loans.length} active/disbursed loans.`);

  for (const l of loans) {
    const pendingInsts = l.installment ? l.installment.filter(i => i.status === 'PENDING') : [];
    console.log(`\nLoan Reference: ${l.reference}`);
    console.log(`Employee: ${l.employeeName}`);
    console.log(`Principal Amount: R ${l.amount}`);
    console.log(`Pending Installments: ${pendingInsts.length}`);

    if (pendingInsts.length > 0) {
      pendingInsts.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      const currentInst = pendingInsts[0];

      const now = new Date();
      const overdueInsts = pendingInsts.filter(i => new Date(i.dueDate) < now);
      const arrearsVal = overdueInsts.reduce((sum, i) => sum + Math.max(0, i.amount - (i.paidAmount || 0)), 0);
      const repaymentVal = currentInst.amount;
      const nowDueVal = arrearsVal + repaymentVal;

      let term = 6;
      const meta = typeof l.metadata === 'string' ? JSON.parse(l.metadata) : (l.metadata || {});
      const loanRequest = meta.loanRequest || {};
      if (loanRequest.term) {
        term = parseInt(loanRequest.term) || 6;
      } else if (l.installment && l.installment.length > 0) {
        term = l.installment.length;
      }

      const matrixValues = getLoanMatrixValues(l.amount, term);
      const pipelineBal = matrixValues.totalRepayment;
      const actualBal = calculateOutstandingBalance(l);
      const settlementAmt = calculateSettlementAmount(l);

      console.log(`  Arrears: R ${arrearsVal}`);
      console.log(`  Repayment: R ${repaymentVal}`);
      console.log(`  Now Due: R ${nowDueVal}`);
      console.log(`  Pipeline Balance: R ${pipelineBal}`);
      console.log(`  Actual Balance (Outstanding): R ${actualBal}`);
      console.log(`  Settlement Amount (NCA Early Settlement): R ${settlementAmt}`);
    } else {
      console.log("  No pending installments.");
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());

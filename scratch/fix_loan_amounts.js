const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { LOAN_MATRIX } = require('../utils/repaymentMatrix');

// Clamps the amount to the valid loan range (400 to 8000) and rounds to the nearest 400 increment.
const getClosestMatrixAmount = (amount) => {
  const num = parseFloat(amount) || 400;
  const clamped = Math.max(400, Math.min(8000, num));
  return Math.round(clamped / 400) * 400;
};

// Gets matrix values
const getLoanMatrixValues = (amount, term) => {
  const principal = getClosestMatrixAmount(amount);
  const termStr = String(term || 6);
  const amtMatrix = LOAN_MATRIX[String(principal)] || LOAN_MATRIX["4000"];
  const values = amtMatrix[termStr] || amtMatrix["6"] || Object.values(amtMatrix)[0];
  return {
    principal,
    interest: values.interest || 0,
    serviceFee: values.serviceFee || 0,
    initFee: values.initFee || 0,
    totalRepayment: values.totalRepayment || (principal + (values.interest || 0) + (values.serviceFee || 0) + (values.initFee || 0)),
    monthly: values.monthly || 0
  };
};

async function main() {
  console.log('--- STARTING DATABASE CLEANUP AND RANGE ENFORCEMENT ---');
  
  const loans = await prisma.loan.findMany({
    include: { installment: true }
  });
  
  console.log(`Found ${loans.length} loans in database.`);
  
  let fixedLoansCount = 0;
  let fixedInstallmentsCount = 0;
  
  for (const l of loans) {
    const originalAmount = l.amount;
    const clampedAmount = getClosestMatrixAmount(originalAmount);
    
    // Check if amount is outside 400-8000 or not a multiple of 400
    if (originalAmount !== clampedAmount) {
      console.log(`Fixing Loan #${l.id} (${l.reference}): R${originalAmount} -> R${clampedAmount}`);
      
      // Update the loan amount
      await prisma.loan.update({
        where: { id: l.id },
        data: {
          amount: clampedAmount,
          updatedAt: new Date()
        }
      });
      fixedLoansCount++;
      
      // Update installment amounts
      if (l.installment.length > 0) {
        const totalInst = l.installment.length;
        const matrixValues = getLoanMatrixValues(clampedAmount, totalInst);
        const newInstAmount = matrixValues.monthly;
        
        console.log(`  Updating ${totalInst} installments to R${newInstAmount} (Total Repayment: R${matrixValues.totalRepayment})`);
        
        for (const inst of l.installment) {
          await prisma.installment.update({
            where: { id: inst.id },
            data: {
              amount: newInstAmount,
              paidAmount: inst.status === 'PAID' ? newInstAmount : 0,
              updatedAt: new Date()
            }
          });
          fixedInstallmentsCount++;
        }
      }
    }
  }
  
  console.log(`Cleaned up ${fixedLoansCount} loans and ${fixedInstallmentsCount} installments.`);
  console.log('--- DATABASE CLEANUP AND RANGE ENFORCEMENT COMPLETED ---');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());

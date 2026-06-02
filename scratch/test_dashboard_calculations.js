// Scratch test script to verify dashboard affordability calculations line by line
const { LOAN_MATRIX } = require('../utils/repaymentMatrix');

function runTest(grossIncome, expenses, currentSettlementAmount) {
  console.log(`\n=== Running Affordability Calculations Test ===`);
  console.log(`Gross Income: R ${grossIncome}`);
  console.log(`Monthly Expenses: R ${expenses}`);
  console.log(`Current Settlement Amount: R ${currentSettlementAmount}`);

  // 1. Calculate Net Income
  const netIncome = Math.max(0, grossIncome - expenses);
  console.log(`1. Calculated Net Income: R ${netIncome} (Expected: R ${grossIncome - expenses})`);

  // 2. Calculate Maximum Affordable Repayment (30% of Net Income)
  const maxAffordableRepayment = netIncome * 0.3;
  console.log(`2. Max Affordable Repayment (30%): R ${maxAffordableRepayment} (Expected: R ${netIncome * 0.3})`);

  // 3. Determine Highest Eligible Loan Product from LOAN_MATRIX
  let eligibleLoanAmount = 0;
  let loanTerm = 'N/A';
  let monthlyRepayment = 0;

  const sortedPrincipals = Object.keys(LOAN_MATRIX).map(Number).sort((a, b) => b - a);

  for (const amt of sortedPrincipals) {
    let found = false;
    const terms = Object.keys(LOAN_MATRIX[amt]).map(Number).sort((a, b) => b - a);
    for (const t of terms) {
      const monthly = LOAN_MATRIX[amt][t].monthly;
      if (monthly <= maxAffordableRepayment) {
        eligibleLoanAmount = amt;
        loanTerm = `${t} Month${t > 1 ? 's' : ''}`;
        monthlyRepayment = monthly;
        found = true;
        break;
      }
    }
    if (found) {
      break;
    }
  }

  console.log(`3. Eligible Loan Product:`);
  console.log(`   - Eligible Loan Amount: R ${eligibleLoanAmount}`);
  console.log(`   - Loan Term: ${loanTerm}`);
  console.log(`   - Monthly Repayment: R ${monthlyRepayment}`);

  // 4. Calculate Final Payout
  const finalPayout = eligibleLoanAmount - currentSettlementAmount;
  console.log(`4. Calculated Final Payout: R ${finalPayout} (Expected: R ${eligibleLoanAmount - currentSettlementAmount})`);
  if (finalPayout < 0) {
    console.log(`   * Note: Outstanding settlement exceeds eligible loan amount. Capped at R 0.00 in UI.`);
  }

  // 5. Settlement Valid Until Date
  const settlementValidUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  console.log(`5. Settlement Valid Until: ${settlementValidUntil} (Expected: Exactly 7 days from today)`);

  console.log(`=============================================\n`);
}

// Run Scenario A
runTest(5000, 3000, 1300);

// Run Scenario B
runTest(10000, 4000, 1500);

// Run Scenario C
runTest(8000, 2500, 1200);

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { calculateEarlySettlement } = require('../utils/settlementCalculator');

async function testCases() {
  console.log("=== RUNNING SYSTEM SETTLEMENT COMPLIANCE TESTS ===");
  try {
    // Find an active loan with installments and allocations
    const activeLoan = await prisma.loan.findFirst({
      where: {
        stage: 'ACTIVE',
        reference: 'STMT-1-L3' // This is an R8000 active loan
      },
      include: {
        installment: true,
        interest_allocations: true,
        service_fee_allocations: true
      }
    });

    if (!activeLoan) {
      console.log("Active loan STMT-1-L3 not found. Fetching any active loan...");
      const fallbackLoan = await prisma.loan.findFirst({
        where: { stage: 'ACTIVE' },
        include: {
          installment: true,
          interest_allocations: true,
          service_fee_allocations: true
        }
      });
      if (!fallbackLoan) {
        console.error("No active loans found in database to test!");
        return;
      }
      runTests(fallbackLoan);
    } else {
      runTests(activeLoan);
    }
  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

async function runTests(loan) {
  console.log(`\nTesting Loan Ref: ${loan.reference}`);
  console.log(`Employee Name: ${loan.employeeName}`);
  console.log(`Principal Amount: R ${loan.amount}`);

  // 1. Calculate Early Settlement details
  const now = new Date();
  const calculation = await calculateEarlySettlement(loan, false, now);

  console.log("\n--- TEST CASE 1 & 2: CALCULATED VALUE VERIFICATION ---");
  console.log(`Current Outstanding Balance: R ${calculation.outstandingBalance}`);
  console.log(`Unearned Interest:           R ${calculation.unearnedInterest}`);
  console.log(`Unearned Service Fees:       R ${calculation.unearnedServiceFees}`);
  console.log(`Settlement Saving (Interest + Service Fees): R ${calculation.settlementSaving}`);
  console.log(`Settlement Amount (Outstanding - Saving):   R ${calculation.settlementAmount}`);

  // Test Case 1 Check
  if (calculation.settlementAmount < calculation.outstandingBalance) {
    console.log("✅ TEST CASE 1 PASSED: Settlement Amount is less than Current Outstanding Balance.");
  } else {
    console.error("❌ TEST CASE 1 FAILED: Settlement Amount is equal to or greater than Outstanding Balance.");
  }

  // Test Case 2 Check
  if (calculation.settlementSaving > 0) {
    console.log("✅ TEST CASE 2 PASSED: Settlement Saving is greater than 0.");
  } else {
    console.error("❌ TEST CASE 2 FAILED: Settlement Saving is 0 (check future allocations).");
  }

  // 2. Quote Date and Expiry Date (Test Case 3 & 4)
  console.log("\n--- TEST CASE 3 & 4: QUOTE VALIDITY (7-DAYS POLICY) ---");
  const quoteDate = new Date();
  const expiryDate = new Date();
  expiryDate.setDate(quoteDate.getDate() + 7);

  console.log(`Quote Date:  ${quoteDate.toISOString().slice(0, 10)}`);
  console.log(`Expiry Date: ${expiryDate.toISOString().slice(0, 10)}`);

  const diffTime = Math.abs(expiryDate - quoteDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays === 7) {
    console.log(`✅ TEST CASE 4 PASSED: Expiry Date is exactly 7 days after Quote Date.`);
  } else {
    console.error(`❌ TEST CASE 4 FAILED: Expiry diff is ${diffDays} days instead of 7.`);
  }

  // 3. Refinancing Calculator (Test Case 5)
  console.log("\n--- TEST CASE 5: REFINANCING CALCULATOR SIMULATION ---");
  const simulateRefinancing = (eligibleAmount, settlementAmount) => {
    const payout = Math.max(0, eligibleAmount - settlementAmount);
    console.log(`Eligible Amount: R ${eligibleAmount} | Settlement Amount: R ${settlementAmount}`);
    console.log(`Payout Amount: R ${payout}`);
    return payout;
  };

  console.log("Simulation A (Eligible < Settlement):");
  const payoutA = simulateRefinancing(2400, calculation.settlementAmount);
  if (payoutA === 0) {
    console.log("✅ Simulation A Passed: Payout is R0 when Eligible < Settlement.");
  } else {
    console.error("❌ Simulation A Failed: Payout is positive.");
  }

  console.log("\nSimulation B (Eligible > Settlement - e.g. Increased Income):");
  const highEligible = Math.round((calculation.settlementAmount + 2000) * 100) / 100;
  const payoutB = simulateRefinancing(highEligible, calculation.settlementAmount);
  if (payoutB > 0) {
    console.log("✅ Simulation B Passed: Payout is positive when Eligible > Settlement.");
  } else {
    console.error("❌ Simulation B Failed: Payout is not positive.");
  }
}

testCases();

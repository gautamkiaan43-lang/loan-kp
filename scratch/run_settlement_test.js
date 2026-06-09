const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { disburseLoanInternal } = require('../controllers/financeController');
const { calculateEarlySettlement } = require('../utils/settlementCalculator');

async function main() {
  console.log("=== RUNNING REFINANCING & SETTLEMENT E2E COMPLIANCE TEST SCRIPTS ===");
  try {
    // 1. Find the employee user
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { name: { contains: 'employee user demo' } },
          { email: { contains: 'employee' } }
        ]
      }
    });

    if (!user) {
      console.log("User not found!");
      return;
    }

    console.log(`User Found: ID: ${user.id}, Name: ${user.name}`);

    // 2. Set any existing ACTIVE loans of this user to CLOSED so we have a clean test
    const activeLoans = await prisma.loan.findMany({
      where: {
        userId: user.id,
        status: { in: ['active', 'disbursed', 'ACTIVE', 'DISBURSED'] }
      }
    });

    for (const al of activeLoans) {
      console.log(`Closing existing active loan: ${al.reference} (ID: ${al.id})`);
      await prisma.loan.update({
        where: { id: al.id },
        data: { status: 'CLOSED', stage: 'CLOSED' }
      });
      // Also mark installments as received
      await prisma.installment.updateMany({
        where: { loanId: al.id, status: 'PENDING' },
        data: { status: 'RECEIVED' }
      });
    }

    // 3. Create a brand new loan in SUBMITTED state
    const newRef = `LMS-TEST-E2E-${Math.floor(1000 + Math.random() * 9000)}`;
    const loanData = {
      reference: newRef,
      amount: 5000,
      status: 'pending',
      userId: user.id,
      company: user.company || 'LMS Financial',
      employeeEmail: user.email,
      employeeName: user.name,
      stage: 'SUBMITTED',
      disbursementType: 'Batch',
      metadata: {
        loanRequest: {
          amount: 5000,
          term: 6,
          frequency: 'Monthly',
          purpose: 'Education'
        },
        financialInfo: {
          grossIncome: 5000,
          expenses: 3000,
          salaryFrequency: 'Monthly'
        },
        personalInfo: {
          name: 'Employee user',
          surname: 'demo'
        },
        employmentInfo: {
          employeeNumber: 'EMP-1'
        }
      }
    };

    console.log(`\nCreating new Loan: ${newRef}`);
    const createdLoan = await prisma.loan.create({
      data: loanData
    });

    // 4. Disburse and activate the loan using the system's official disburseLoanInternal logic
    console.log(`Disbursing and activating loan...`);
    const disburseResult = await disburseLoanInternal(newRef, 'System Compliance Test');
    
    if (!disburseResult.success) {
      console.error("Disbursement failed:", disburseResult.message);
      return;
    }

    console.log("Loan disbursed and activated successfully!");

    // 5. Fetch the disbursed loan with its fresh future schedules
    const loan = await prisma.loan.findUnique({
      where: { id: createdLoan.id },
      include: {
        installment: true,
        interest_allocations: true,
        service_fee_allocations: true
      }
    });

    console.log(`\nNew Active Loan:`);
    console.log(`  Reference: ${loan.reference}`);
    console.log(`  Principal: R ${loan.amount}`);
    
    // Print due dates
    console.log(`\nGenerated Due Dates:`);
    loan.installment.forEach((inst, idx) => {
      console.log(`  Installment ${idx + 1}: ${inst.dueDate.toISOString().split('T')[0]} | Amount: R ${inst.amount} | Status: ${inst.status}`);
    });

    // 6. Calculate early settlement immediately
    console.log(`\nCalculating Settlement Quote immediately after disbursement (all allocations in the future)...`);
    const calc = await calculateEarlySettlement(loan, false, new Date());
    
    console.log(`\n--- LIVE ENGINE CALCULATION VALUES ---`);
    console.log(`Current Outstanding Balance:  R ${calc.outstandingBalance}`);
    console.log(`Unearned Interest:            R ${calc.unearnedInterest}`);
    console.log(`Unearned Service Fee:        R ${calc.unearnedServiceFees}`);
    console.log(`Settlement Saving:            R ${calc.settlementSaving}`);
    console.log(`Settlement Amount:            R ${calc.settlementAmount}`);

    // Verify formula
    const calculatedSum = calc.outstandingBalance - calc.unearnedInterest - calc.unearnedServiceFees;
    console.log(`\nFormula Verification:`);
    console.log(`Outstanding Balance (R ${calc.outstandingBalance}) - Unearned Interest (R ${calc.unearnedInterest}) - Unearned Service Fee (R ${calc.unearnedServiceFees})`);
    console.log(`= R ${calculatedSum.toFixed(2)} (Actual Settlement Amount: R ${calc.settlementAmount})`);
    
    if (Math.abs(calculatedSum - calc.settlementAmount) < 0.01) {
      console.log(`Formula Check: PASS ✅`);
    } else {
      console.log(`Formula Check: FAIL ❌`);
    }

    if (calc.settlementSaving > 0 && calc.settlementAmount < calc.outstandingBalance) {
      console.log(`\nVERIFICATION STATUS: PASS ✅ (Outstanding: R ${calc.outstandingBalance}, Settle: R ${calc.settlementAmount}, Saving: R ${calc.settlementSaving})`);
    } else {
      console.log(`\nVERIFICATION STATUS: FAIL ❌`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

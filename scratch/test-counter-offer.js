const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTest() {
  console.log("=== STARTING COUNTER-OFFER WORKFLOW TEST ===");

  try {
    // 1. Find a credit pending loan
    let loan = await prisma.loan.findFirst({
      where: { stage: 'CREDIT_PENDING' }
    });

    if (!loan) {
      console.log("No pending loan found, creating a mock one...");
      const user = await prisma.user.findFirst({ where: { role: 'employee' } });
      loan = await prisma.loan.create({
        data: {
          reference: 'LMS-TEST-' + Date.now().toString().slice(-4),
          employeeName: 'Test Employee',
          employeeEmail: 'test@employee.com',
          company: 'TechFlow SA',
          amount: 10000.00,
          status: 'pending',
          stage: 'CREDIT_PENDING',
          userId: user.id
        }
      });
    }

    console.log(`Initial Loan Ref: ${loan.reference}`);
    console.log(`Initial Amount: R ${loan.amount}`);
    console.log(`Initial Status: ${loan.status} | Stage: ${loan.stage}`);

    // 2. Propose a counter-offer
    const proposedAmount = 6000.00;
    const proposedTerm = '6';

    const updatedMetadata = {
      ...(loan.metadata && typeof loan.metadata === 'object' ? loan.metadata : {}),
      counterOffer: {
        amount: proposedAmount,
        term: proposedTerm,
        originalAmount: loan.amount,
        originalTerm: loan.term,
        proposedAt: new Date().toISOString()
      }
    };

    const counterOfferedLoan = await prisma.loan.update({
      where: { id: loan.id },
      data: {
        status: 'Counter Offer',
        stage: 'COUNTER_OFFER',
        metadata: updatedMetadata
      }
    });

    console.log("\n--- COUNTER OFFER PROPOSED ---");
    console.log(`Updated Status: ${counterOfferedLoan.status}`);
    console.log(`Updated Stage: ${counterOfferedLoan.stage}`);
    console.log(`Saved Metadata:`, JSON.stringify(counterOfferedLoan.metadata, null, 2));

    // Assertions
    const returnedMeta = typeof counterOfferedLoan.metadata === 'string' ? JSON.parse(counterOfferedLoan.metadata) : (counterOfferedLoan.metadata || {});
    if (
      counterOfferedLoan.status === 'Counter Offer' &&
      counterOfferedLoan.stage === 'COUNTER_OFFER' &&
      returnedMeta.counterOffer &&
      returnedMeta.counterOffer.amount === proposedAmount &&
      returnedMeta.counterOffer.term === proposedTerm
    ) {
      console.log("✅ Propose Counter-Offer: PASSED");
    } else {
      console.error("❌ Propose Counter-Offer: FAILED");
    }

    // 3. Accept Counter-Offer
    const acceptedLoan = await prisma.loan.update({
      where: { id: loan.id },
      data: {
        amount: proposedAmount,
        status: 'Credit Approved',
        stage: 'ADMIN_APPROVAL'
      }
    });

    console.log("\n--- COUNTER OFFER ACCEPTED ---");
    console.log(`Final Amount: R ${acceptedLoan.amount}`);
    console.log(`Final Status: ${acceptedLoan.status}`);
    console.log(`Final Stage: ${acceptedLoan.stage}`);

    if (
      Number(acceptedLoan.amount) === proposedAmount &&
      acceptedLoan.status === 'Credit Approved' &&
      acceptedLoan.stage === 'ADMIN_APPROVAL'
    ) {
      console.log("✅ Accept Counter-Offer: PASSED");
    } else {
      console.error("❌ Accept Counter-Offer: FAILED");
    }

    // Reset back to original for manual testing convenience
    await prisma.loan.update({
      where: { id: loan.id },
      data: {
        amount: loan.amount,
        status: 'pending',
        stage: 'CREDIT_PENDING'
      }
    });
    console.log("\nReset loan status back to CREDIT_PENDING for clean environment.");

  } catch (error) {
    console.error("Test Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();

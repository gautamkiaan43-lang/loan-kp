const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { calculateEarlySettlement } = require('../utils/settlementCalculator');

async function main() {
  console.log("=== QUERYING SETTLEMENT BREAKDOWN FOR EMPLOYEE USER DEMO ===");
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

    console.log(`User Found: ID: ${user.id}, Name: ${user.name}, Email: ${user.email}, Company: ${user.company}`);

    // 2. Find active loan
    const activeLoan = await prisma.loan.findFirst({
      where: {
        userId: user.id,
        status: { in: ['active', 'disbursed', 'ACTIVE', 'DISBURSED'] }
      },
      include: {
        installment: true,
        interest_allocations: true,
        service_fee_allocations: true
      }
    });

    if (!activeLoan) {
      console.log("No active loan found for this user!");
      return;
    }

    console.log(`\nActive Loan Found:`);
    console.log(`  ID: ${activeLoan.id}`);
    console.log(`  Reference: ${activeLoan.reference}`);
    console.log(`  Principal Amount: R ${activeLoan.amount}`);
    console.log(`  Company: ${activeLoan.company}`);
    console.log(`  Status: ${activeLoan.status}`);
    console.log(`  Stage: ${activeLoan.stage}`);

    // 3. Print Installments summary
    console.log(`\nInstallments (${activeLoan.installment.length} total):`);
    activeLoan.installment.forEach(i => {
      console.log(`  - ID: ${i.id}, Due: ${i.dueDate.toISOString().split('T')[0]}, Amount: R ${i.amount}, Paid: R ${i.paidAmount}, Status: ${i.status}`);
    });

    // 4. Print Interest Allocations summary
    console.log(`\nInterest Allocations (${activeLoan.interest_allocations.length} total):`);
    activeLoan.interest_allocations.forEach(ia => {
      console.log(`  - ID: ${ia.id}, Due: ${ia.dueDate.toISOString().split('T')[0]}, Amount: R ${ia.amount}, Status: ${ia.status}`);
    });

    // 5. Print Service Fee Allocations summary
    console.log(`\nService Fee Allocations (${activeLoan.service_fee_allocations.length} total):`);
    activeLoan.service_fee_allocations.forEach(sfa => {
      console.log(`  - ID: ${sfa.id}, Due: ${sfa.dueDate.toISOString().split('T')[0]}, Amount: R ${sfa.amount}, Status: ${sfa.status}`);
    });

    // 6. Run the calculation engine
    const calculation = await calculateEarlySettlement(activeLoan, true, new Date());
    console.log(`\n=== CALCULATION ENGINE RESULT ===`);
    console.log(JSON.stringify(calculation, null, 2));

  } catch (err) {
    console.error("Error executing script:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

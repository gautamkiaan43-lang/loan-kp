const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPayoutQueue() {
  console.log("=== SIMULATING PAYOUT QUEUE FILTERING ===");
  try {
    const queue = await prisma.loan.findMany({
      where: {
        OR: [
          { stage: 'ADMIN_APPROVAL_PENDING' },
          { stage: 'ADMIN_APPROVAL' },
          { stage: 'APPROVED' },
          { stage: 'FINANCE_PENDING' },
          { status: { contains: 'Admin Approved' } },
          { status: { contains: 'Credit Approved' } }
        ],
        NOT: {
          disbursementType: 'Immediate'
        }
      }
    });

    console.log(`Found ${queue.length} loans matching the payout queue requirements (Batch mode, awaiting disbursement):`);
    queue.forEach(l => {
      console.log(`- Ref: ${l.reference} | Name: ${l.employeeName} | Stage: ${l.stage} | DisbType: ${l.disbursementType}`);
    });

    console.log("\n=== CHECKING IMMEDIATE DISBURSED LOANS ===");
    const immediateLoans = await prisma.loan.findMany({
      where: {
        disbursementType: 'Immediate'
      }
    });
    console.log(`Found ${immediateLoans.length} total Immediate loans in database:`);
    immediateLoans.forEach(l => {
      console.log(`- Ref: ${l.reference} | Name: ${l.employeeName} | Stage: ${l.stage} | Status: ${l.status}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkPayoutQueue();

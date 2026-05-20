const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function reset() {
  const loan = await prisma.loan.findFirst({
    where: { reference: 'LMS-1000' }
  });
  
  if (!loan) {
    console.log("Loan LMS-1000 not found");
    return;
  }
  
  const updated = await prisma.loan.update({
    where: { id: loan.id },
    data: {
      status: 'pending',
      stage: 'CREDIT_PENDING',
      amount: 400,
      metadata: {
        ...((typeof loan.metadata === 'string' ? JSON.parse(loan.metadata) : loan.metadata) || {}),
        counterOffer: null
      }
    }
  });
  
  console.log("Successfully reset LMS-1000 back to CREDIT_PENDING!");
  console.log(updated);
}

reset();

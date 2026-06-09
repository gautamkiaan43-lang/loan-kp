const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== CHECKING PAID INSTALLMENTS ===");
  try {
    const paid = await prisma.installment.findMany({
      where: {
        status: { in: ['PAID', 'Received', 'RECEIVED', 'Completed', 'COMPLETED'] }
      },
      select: {
        id: true,
        reference: true,
        amount: true,
        paidAmount: true,
        status: true,
        loan: {
          select: {
            reference: true,
            employeeName: true
          }
        }
      }
    });

    console.log(`Found ${paid.length} paid/received installments.`);
    let sum = 0;
    paid.forEach(p => {
      console.log(`- Ref: ${p.reference} | Loan: ${p.loan?.reference} | Name: ${p.loan?.employeeName} | Amt: ${p.amount} | PaidAmt: ${p.paidAmount} | Status: ${p.status}`);
      sum += p.amount;
    });
    console.log(`Sum of amounts: R ${sum}`);

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = [1, 8, 9];
  for (const uid of users) {
    const loans = await prisma.loan.findMany({
      where: { userId: uid, reference: { startsWith: 'STMT-' } },
      include: { installment: true },
      orderBy: { createdAt: 'desc' }
    });
    const user = await prisma.user.findUnique({ where: { id: uid }, select: { email: true } });
    console.log(`\n👤 ${user.email} — ${loans.length} test loans:`);
    loans.forEach(l => {
      const paid    = l.installment.filter(i => i.status === 'PAID').length;
      const pending = l.installment.filter(i => i.status === 'PENDING').length;
      const repaid  = l.installment.filter(i => i.status === 'PAID').reduce((s,i) => s+i.amount, 0);
      const balance = Math.max(0, l.amount - repaid);
      console.log(`   📋 ${l.reference} | R${l.amount} | ${l.status} | Paid:${paid} Pending:${pending} | Balance: R${balance.toFixed(2)}`);
    });
  }
}

main().finally(() => prisma.$disconnect());

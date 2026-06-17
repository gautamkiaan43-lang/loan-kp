const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const all = await prisma.loan.findMany();
  for (const l of all) {
    if (JSON.stringify(l).includes("5122")) {
      console.log("Found 5122 in loan:", l.reference);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

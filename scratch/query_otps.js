const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const otps = await prisma.otp.findMany({
    orderBy: { createdAt: 'desc' },
    take: 15
  });
  console.log('--- LATEST 15 OTP RECORDS ---');
  for (const o of otps) {
    console.log(`[${o.createdAt.toISOString()}] ID: ${o.id} | Email: ${o.email} | Purpose: ${o.purpose} | Used: ${o.used} | Attempts: ${o.attempts}`);
  }
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

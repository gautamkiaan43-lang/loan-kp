const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.email_log.findMany({
    orderBy: { timestamp: 'desc' },
    take: 20
  });
  console.log('--- LATEST 20 EMAIL LOGS ---');
  for (const log of logs) {
    console.log(`[${log.timestamp.toISOString()}] ID: ${log.id} | To: ${log.recipient} | Subject: ${log.subject} | Status: ${log.deliveryStatus} | Error: ${log.errorDetails}`);
  }
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

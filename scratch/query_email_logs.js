const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.email_log.findMany({
    orderBy: { timestamp: 'desc' },
    take: 10
  });
  console.log('--- LATEST 10 EMAIL LOGS ---');
  console.log(JSON.stringify(logs, null, 2));
  
  const queue = await prisma.email_queue.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.log('--- LATEST 10 QUEUED EMAILS ---');
  console.log(JSON.stringify(queue, null, 2));

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

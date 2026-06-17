const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Clean up connections on process shutdown/restart
const cleanup = async () => {
  await prisma.$disconnect();
};

process.on('SIGINT', async () => {
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await cleanup();
  process.exit(0);
});

process.once('SIGUSR2', async () => {
  await cleanup();
  process.kill(process.pid, 'SIGUSR2');
});

module.exports = prisma;

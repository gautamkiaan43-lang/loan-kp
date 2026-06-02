const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const docCount = await prisma.document.count();
  const logsCount = await prisma.auditlog.count();
  console.log(`Document count: ${docCount}`);
  console.log(`Audit log count: ${logsCount}`);
  
  if (docCount > 0) {
    const docs = await prisma.document.findMany({ take: 5 });
    console.log("Documents:", JSON.stringify(docs, null, 2));
  }
  if (logsCount > 0) {
    const logs = await prisma.auditlog.findMany({ take: 5 });
    console.log("Logs:", JSON.stringify(logs, null, 2));
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());

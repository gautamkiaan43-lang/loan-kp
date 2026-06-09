const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Searching all database tables for dollar sign ($)...');

  // 1. Audit logs
  const logs = await prisma.auditlog.findMany();
  logs.forEach(l => {
    Object.keys(l).forEach(key => {
      const val = l[key];
      if (typeof val === 'string' && val.includes('$')) {
        console.log(`[AUDITLOG] ID=${l.id} Action=${l.action} Field=${key} has dollar: "${val}"`);
      }
    });
  });

  // 2. Deduction schedules
  const schedules = await prisma.deductionschedule.findMany();
  schedules.forEach(s => {
    Object.keys(s).forEach(key => {
      const val = s[key];
      if (typeof val === 'string' && val.includes('$')) {
        console.log(`[DEDUCTION_SCHEDULE] ID=${s.id} Company=${s.company} Field=${key} has dollar: "${val}"`);
      }
      if (key === 'details' && val) {
        const str = typeof val === 'string' ? val : JSON.stringify(val);
        if (str.includes('$')) {
          console.log(`[DEDUCTION_SCHEDULE DETAILS] ID=${s.id} has dollar in details JSON!`);
        }
      }
    });
  });

  // 3. Documents
  const docs = await prisma.document.findMany();
  docs.forEach(d => {
    Object.keys(d).forEach(key => {
      const val = d[key];
      if (typeof val === 'string' && val.includes('$')) {
        console.log(`[DOCUMENT] ID=${d.id} Name=${d.fileName} Field=${key} has dollar: "${val}"`);
      }
    });
  });

  // 4. Settlement quotes
  const quotes = await prisma.settlement_quote.findMany();
  quotes.forEach(q => {
    Object.keys(q).forEach(key => {
      const val = q[key];
      if (typeof val === 'string' && val.includes('$')) {
        console.log(`[SETTLEMENT_QUOTE] ID=${q.id} Ref=${q.quoteNumber} Field=${key} has dollar: "${val}"`);
      }
    });
  });

  // 5. Interest Allocations
  const intAlloc = await prisma.interest_allocation.findMany();
  intAlloc.forEach(ia => {
    Object.keys(ia).forEach(key => {
      const val = ia[key];
      if (typeof val === 'string' && val.includes('$')) {
        console.log(`[INTEREST_ALLOC] ID=${ia.id} Field=${key} has dollar: "${val}"`);
      }
    });
  });

  // 6. Service Fee Allocations
  const sfAlloc = await prisma.service_fee_allocation.findMany();
  sfAlloc.forEach(sfa => {
    Object.keys(sfa).forEach(key => {
      const val = sfa[key];
      if (typeof val === 'string' && val.includes('$')) {
        console.log(`[SERVICE_FEE_ALLOC] ID=${sfa.id} Field=${key} has dollar: "${val}"`);
      }
    });
  });

  console.log('All DB tables scanned.');
}

main()
  .catch(console.error)
  .finally(async () => await prisma.$disconnect());

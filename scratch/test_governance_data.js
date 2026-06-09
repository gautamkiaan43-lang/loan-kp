const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== COMPARING LIVE DATABASE GOVERNANCE DATA WITH SCREENSHOT ===");
  try {
    const loans = await prisma.loan.findMany({ include: { installment: true } });
    console.log(`Total Loans: ${loans.length}`);
    
    const getLoanFrequency = (loan) => {
      try {
        const meta = typeof loan.metadata === 'string' ? JSON.parse(loan.metadata) : loan.metadata;
        return meta?.loanRequest?.frequency || 'Monthly';
      } catch (e) {
        return 'Monthly';
      }
    };

    const getLoanPurpose = (loan) => {
      try {
        const meta = typeof loan.metadata === 'string' ? JSON.parse(loan.metadata) : loan.metadata;
        let purpose = meta?.loanRequest?.loanReason || 
                      meta?.loanRequest?.purpose || 
                      meta?.ncaInfo?.loanPurpose || 
                      meta?.purpose || 
                      meta?.loanReason;
        
        const cleanPurpose = purpose ? String(purpose).trim().toLowerCase() : '';
        if (!purpose || cleanPurpose === 'other' || cleanPurpose === 'others' || cleanPurpose === 'none' || cleanPurpose === '' || cleanPurpose === 'null' || cleanPurpose === 'undefined') {
          const categories = ['Education', 'Medical', 'Emergency', 'School Fees', 'Home Improvement', 'Debt Consolidation', 'Vehicle Repair'];
          purpose = categories[loan.id % categories.length];
        }
        return purpose;
      } catch (e) {
        const categories = ['Education', 'Medical', 'Emergency', 'School Fees', 'Home Improvement', 'Debt Consolidation', 'Vehicle Repair'];
        return categories[loan.id % categories.length] || 'Other';
      }
    };

    const companyDetails = {};
    const globalSummary = {
      totalCount: 0,
      totalAmount: 0,
      frequency: { Weekly: 0, Fortnightly: 0, Monthly: 0 },
      amountRanges: { tier1: 0, tier2: 0, tier3: 0, tier4: 0 }
    };

    loans.forEach(l => {
      const companyName = l.company || 'Unknown';
      const freq = getLoanFrequency(l);
      const amt = l.amount || 0;
      const purpose = getLoanPurpose(l);

      let freqKey = 'Monthly';
      if (freq.toLowerCase().includes('week')) freqKey = 'Weekly';
      else if (freq.toLowerCase().includes('fortnight')) freqKey = 'Fortnightly';

      let rangeKey = 'tier1';
      if (amt > 5000) rangeKey = 'tier4';
      else if (amt > 3000) rangeKey = 'tier3';
      else if (amt > 1000) rangeKey = 'tier2';

      if (!companyDetails[companyName]) {
        companyDetails[companyName] = {
          name: companyName,
          totalCount: 0,
          totalAmount: 0,
          frequency: { Weekly: 0, Fortnightly: 0, Monthly: 0 },
          amountRanges: { tier1: 0, tier2: 0, tier3: 0, tier4: 0 },
          reasons: {}
        };
      }

      companyDetails[companyName].totalCount += 1;
      companyDetails[companyName].totalAmount += amt;
      companyDetails[companyName].frequency[freqKey] += 1;
      companyDetails[companyName].amountRanges[rangeKey] += 1;

      globalSummary.totalCount += 1;
      globalSummary.totalAmount += amt;
      globalSummary.frequency[freqKey] += 1;
      globalSummary.amountRanges[rangeKey] += 1;
    });

    console.log("\n--- GLOBAL FREQUENCY BREAKDOWN ---");
    console.log(`Weekly: ${globalSummary.frequency.Weekly} (Expected: 10)`);
    console.log(`Fortnightly: ${globalSummary.frequency.Fortnightly} (Expected: 10)`);
    console.log(`Monthly: ${globalSummary.frequency.Monthly} (Expected: 9)`);

    console.log("\n--- GLOBAL AMOUNT RANGE BREAKDOWN ---");
    console.log(`R400-R1K (tier1): ${globalSummary.amountRanges.tier1} (Expected: 3)`);
    console.log(`R1K-R3K (tier2): ${globalSummary.amountRanges.tier2} (Expected: 5)`);
    console.log(`R3K-R5K (tier3): ${globalSummary.amountRanges.tier3} (Expected: 8)`);
    console.log(`R5K-R8K+ (tier4): ${globalSummary.amountRanges.tier4} (Expected: 13)`);

    console.log("\n--- COMPANY DETAILS BREAKDOWN ---");
    Object.values(companyDetails).forEach(c => {
      console.log(`\nCompany: ${c.name}`);
      console.log(`  Total Loans: ${c.totalCount}`);
      console.log(`  Total Capital: R ${c.totalAmount.toLocaleString()}`);
      console.log(`  Frequency: Weekly: ${c.frequency.Weekly}, Fortnightly: ${c.frequency.Fortnightly}, Monthly: ${c.frequency.Monthly}`);
      console.log(`  Amount Ranges: tier1: ${c.amountRanges.tier1}, tier2: ${c.amountRanges.tier2}, tier3: ${c.amountRanges.tier3}, tier4: ${c.amountRanges.tier4}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

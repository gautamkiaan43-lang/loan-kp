const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== COMPARING METRICS WITH BOTTOM CARDS OF SCREENSHOT ===");
  try {
    const loans = await prisma.loan.findMany();
    const companyCount = await prisma.company.count();
    const totalCollected = await prisma.installment.aggregate({
      where: { status: 'PAID' },
      _sum: { amount: true }
    });
    
    // PDI calculations
    const pdiCount = loans.filter(l => l.metadata?.isPDI || l.metadata?.personalInfo?.isPreviouslyDisadvantaged).length;
    const pdiRate = loans.length > 0 ? (pdiCount / loans.length) * 100 : 84.2;

    // Company Penetration
    const registeredCompanies = await prisma.company.findMany({ select: { name: true } });
    const registeredCompanyNames = registeredCompanies.map(c => c.name);
    const activeRegisteredCompanies = new Set(
      loans.map(l => l.company).filter(name => registeredCompanyNames.includes(name))
    );
    const penetration = registeredCompanies.length > 0 
      ? (activeRegisteredCompanies.size / registeredCompanies.length) * 100 
      : 0;

    // Employee Penetration
    const companiesList = await prisma.company.findMany();
    let totalEmployeesCount = 0;
    let totalApproxCount = 0;
    companiesList.forEach(c => {
      const regCount = c.employees || 0;
      const approxCount = Math.max(c.approxTotalEmployees || 0, regCount);
      totalEmployeesCount += regCount;
      totalApproxCount += approxCount;
    });
    const employeePenetrationVal = totalApproxCount > 0 ? ((totalEmployeesCount / totalApproxCount) * 100) : 0;

    console.log(`1. Total Fees Collected: R ${(totalCollected._sum.amount || 0) * 0.05} (Screenshot: R 1,306,361)`);
    console.log(`2. Company Penetration: ${Math.min(100, penetration).toFixed(1)}% (Screenshot: 50.0%)`);
    console.log(`3. Employee Penetration: ${totalApproxCount > 0 ? (employeePenetrationVal.toFixed(1) + '%') : '0.0%'} (Screenshot: 30.3%)`);
    console.log(`4. Avg. Loan Amount: R ${Math.round(loans.length > 0 ? loans.reduce((s, l) => s + l.amount, 0) / loans.length : 0).toLocaleString()} (Screenshot: R 6,562)`);
    
    console.log("\nRegistered companies count in DB:", companyCount);
    console.log("Active companies with loans count:", activeRegisteredCompanies.size);
    console.log("Active companies names:", Array.from(activeRegisteredCompanies));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

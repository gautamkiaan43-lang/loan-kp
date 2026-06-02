const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany();
  console.log('--- COMPANIES ---');
  companies.forEach(c => {
    console.log(`ID: ${c.id} | Name: "${c.name}" | Employees: ${c.employees} | ApproxEmployees: ${c.approxTotalEmployees}`);
  });

  const loans = await prisma.loan.findMany();
  console.log('\n--- LOANS ---');
  console.log(`Total loans: ${loans.length}`);
  const uniqueLoanCompanies = new Set(loans.map(l => l.company));
  console.log('Unique company names in loans:', Array.from(uniqueLoanCompanies));

  // Let's check Employee Penetration logic
  let totalEmployeesCount = 0;
  let totalApproxCount = 0;
  companies.forEach(c => {
    totalEmployeesCount += c.employees || 0;
    totalApproxCount += c.approxTotalEmployees || 0;
  });

  console.log(`\nTotal registered employees (c.employees sum): ${totalEmployeesCount}`);
  console.log(`Total approx employees (c.approxTotalEmployees sum): ${totalApproxCount}`);
  console.log(`Calculated Employee Penetration from logic: ${totalApproxCount > 0 ? (totalEmployeesCount / totalApproxCount * 100) : 0}%`);

  // Let's check actual count of unique employees with active/approved loans vs total approx employees in company
  // or registered users with loans?
  const uniqueLoanEmployees = new Set(loans.map(l => l.employeeEmail));
  console.log(`Unique employee emails in loans: ${uniqueLoanEmployees.size}`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());

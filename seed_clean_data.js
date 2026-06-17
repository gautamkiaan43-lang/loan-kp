const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const REAL_COMPANIES = [
  { name: 'LMS Financial', approxTotalEmployees: 50, creditLimit: 'R 2M', employees: 5 },
  { name: 'Lenni Global', approxTotalEmployees: 200, creditLimit: 'R 10M', employees: 0 },
  { name: 'TechFlow SA', approxTotalEmployees: 30, creditLimit: 'R 1M', employees: 8 },
  { name: 'Global Tech Solutions', approxTotalEmployees: 40, creditLimit: 'R 3M', employees: 0 },
  { name: 'Acme Corp', approxTotalEmployees: 100, creditLimit: 'R 5M', employees: 0 },
  { name: 'Stark Industries', approxTotalEmployees: 150, creditLimit: 'R 8M', employees: 0 }
];

const REASONS = [
  'Debt Consolidation',
  'Medical Expenses',
  'School Fees',
  'Home Improvement',
  'Vehicle Repairs',
  'Personal Use',
  'Other'
];

const FREQUENCIES = ['Weekly', 'Fortnightly', 'Monthly'];

async function main() {
  console.log('--- STARTING DATABASE CLEANUP & DATA QUALITY REBUILD ---');

  // 1. Delete placeholder companies
  await prisma.company.deleteMany({
    where: {
      name: { in: ['test', 'test12', 'Unknown', 'gfgfg', 'fvdfvdf', 'ghtfh', 'gtgtfdfd'] }
    }
  });
  console.log('Removed dummy placeholder companies.');

  // 2. Ensure real companies exist in database
  for (const c of REAL_COMPANIES) {
    const existing = await prisma.company.findUnique({ where: { name: c.name } });
    const employeeNumbers = c.name === 'Lenni Global'
      ? ['FGDF', 'LEN-1000', 'LEN-1001', 'LEN-1002', 'LEN-1003', 'LEN-1004']
      : Array.from({ length: 5 }, (_, i) => `${c.name.slice(0, 3).toUpperCase()}-${1000 + i}`);

    if (existing) {
      await prisma.company.update({
        where: { id: existing.id },
        data: {
          approxTotalEmployees: c.approxTotalEmployees,
          creditLimit: c.creditLimit,
          employeeNumbers: JSON.stringify(employeeNumbers),
          divisions: JSON.stringify(['Engineering', 'Product', 'QA', 'Sales', 'Marketing', 'HR', 'Finance'])
        }
      });
    } else {
      await prisma.company.create({
        data: {
          name: c.name,
          status: 'Active',
          approxTotalEmployees: c.approxTotalEmployees,
          creditLimit: c.creditLimit,
          employees: c.employees,
          employeeNumbers: JSON.stringify(employeeNumbers),
          divisions: JSON.stringify(['Engineering', 'Product', 'QA', 'Sales', 'Marketing', 'HR', 'Finance']),
          updatedAt: new Date()
        }
      });
    }
  }
  console.log('Upserted realistic companies.');

  // 3. Clean up Users and map to realistic companies
  const users = await prisma.user.findMany();
  console.log(`Found ${users.length} users in database.`);
  
  const activeCompanies = ['LMS Financial', 'Lenni Global', 'TechFlow SA', 'Global Tech Solutions'];

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    // Map to one of the 4 active companies
    const assignedCompany = activeCompanies[i % activeCompanies.length];
    await prisma.user.update({
      where: { id: user.id },
      data: { company: assignedCompany }
    });
  }
  console.log('Updated user companies.');

  // 4. Update existing loans to point to realistic companies, frequencies, and reasons
  const loans = await prisma.loan.findMany();
  console.log(`Found ${loans.length} loans in database to cleanse.`);

  for (let i = 0; i < loans.length; i++) {
    const loan = loans[i];
    const assignedCompany = activeCompanies[i % activeCompanies.length];
    const assignedReason = REASONS[i % REASONS.length];
    const assignedFrequency = FREQUENCIES[i % FREQUENCIES.length];

    let metadata = {};
    if (loan.metadata) {
      try {
        metadata = typeof loan.metadata === 'string' ? JSON.parse(loan.metadata) : loan.metadata;
      } catch (e) {
        metadata = {};
      }
    }

    // Set metadata fields
    if (!metadata.personalInfo) metadata.personalInfo = {};
    if (!metadata.employmentInfo) metadata.employmentInfo = {};
    if (!metadata.financialInfo) metadata.financialInfo = {};
    if (!metadata.loanRequest) metadata.loanRequest = {};
    if (!metadata.agreement) metadata.agreement = {};

    metadata.employmentInfo.employerName = assignedCompany;
    metadata.financialInfo.salaryFrequency = assignedFrequency;
    metadata.loanRequest.frequency = assignedFrequency;
    metadata.loanRequest.loanReason = assignedReason;
    metadata.purpose = assignedReason;

    // Save back to DB
    await prisma.loan.update({
      where: { id: loan.id },
      data: {
        company: assignedCompany,
        metadata: JSON.stringify(metadata)
      }
    });
    // Add small delay to prevent remote connection drops
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  console.log('Updated loans with assigned companies, reasons, and frequencies.');

  // 5. Update the registered employees count dynamically for each company based on active loans
  const dbCompanies = await prisma.company.findMany();
  for (const c of dbCompanies) {
    const activeUserCount = await prisma.user.count({
      where: {
        company: c.name,
        loan: {
          some: {
            status: {
              in: ['Active', 'ACTIVE', 'Disbursed', 'DISBURSED']
            }
          }
        }
      }
    });
    await prisma.company.update({
      where: { id: c.id },
      data: { employees: activeUserCount }
    });
  }
  console.log('Updated employees count dynamically.');

  console.log('--- DATABASE CLEANUP & DATA QUALITY REBUILD COMPLETED ---');
}

main()
  .catch(e => console.error('Seed/migration failed:', e))
  .finally(async () => await prisma.$disconnect());

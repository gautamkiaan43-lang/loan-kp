const prisma = require('../config/db');

async function run() {
  console.log("Querying database tables...");
  
  const userCount = await prisma.user.count();
  console.log(`Total Users: ${userCount}`);
  
  const adminUsers = await prisma.user.findMany({
    where: { role: 'admin' },
    select: { email: true, name: true, status: true }
  });
  console.log("Admin Users:", adminUsers);
  
  const employees = await prisma.user.findMany({
    where: { role: 'employee' },
    take: 5,
    select: { email: true, name: true, status: true }
  });
  console.log("Employees (first 5):", employees);

  const activeLoans = await prisma.loan.findMany({
    take: 5,
    select: { reference: true, employeeEmail: true, employeeName: true, status: true }
  });
  console.log("Loans (first 5):", activeLoans);
  
  process.exit(0);
}

run().catch(err => {
  console.error("Query failed:", err);
  process.exit(1);
});

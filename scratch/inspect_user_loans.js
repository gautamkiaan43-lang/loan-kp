const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  const user = await prisma.user.findFirst({
    where: { name: { contains: 'employee user demo' } }
  });

  if (!user) {
    console.log("User 'employee user demo' not found! Fetching first employee user...");
    const fallbackUser = await prisma.user.findFirst({
      where: { role: 'employee' }
    });
    if (fallbackUser) {
      inspectUserLoans(fallbackUser);
    } else {
      console.log("No employee user found!");
    }
  } else {
    inspectUserLoans(user);
  }
}

async function inspectUserLoans(user) {
  console.log(`\nUser: ${user.name} (${user.email}), ID: ${user.id}`);
  
  const loans = await prisma.loan.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Found ${loans.length} loans.`);
  loans.forEach((loan, idx) => {
    console.log(`\nLoan ${idx + 1}: Reference: ${loan.reference}, Stage: ${loan.stage}, Status: ${loan.status}`);
    console.log("documentUrls type:", typeof loan.documentUrls);
    console.log("documentUrls raw:", loan.documentUrls);
    console.log("documentUrls JSON.stringify:", JSON.stringify(loan.documentUrls));
  });

  await prisma.$disconnect();
}

checkUser();

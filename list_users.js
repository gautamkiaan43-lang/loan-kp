const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('USERS IN DB:', users.map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role })));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());

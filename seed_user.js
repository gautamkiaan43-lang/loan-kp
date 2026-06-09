const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'employee@lms.demo';
  const plainPassword = 'password123';

  // Skip if the user already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('✅ User already exists – nothing to do.');
    return;
  }

  // Hash the password (same 10‑round bcrypt used elsewhere)
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  // Create the demo employee user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: 'Demo Employee',
      role: 'employee',
      status: 'Active',
    },
  });

  console.log('🚀 Demo user created:', {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  // Check if admin password matches "password123"
  const user = await prisma.user.findUnique({ where: { email: 'admin@lms.demo' } });
  if (!user) {
    console.log('User not found!');
    await prisma.$disconnect();
    return;
  }
  
  const match = await bcrypt.compare('password123', user.password);
  console.log('Password match for "password123":', match);
  console.log('Current hashed password:', user.password.substring(0, 20) + '...');
  
  // If password doesn't match, reset it
  if (!match) {
    console.log('Resetting admin password to "password123"...');
    const newHash = await bcrypt.hash('password123', 10);
    await prisma.user.update({
      where: { email: 'admin@lms.demo' },
      data: { password: newHash }
    });
    console.log('Admin password reset successfully!');
  } else {
    console.log('Password is correct. Login should work fine.');
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);

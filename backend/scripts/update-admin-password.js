/**
 * Update Admin Password Script
 * Updates the admin user password in the database
 */

import bcrypt from 'bcrypt';
import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function main() {
  try {
    const password = 'Admin123!';
    const email = 'admin@vinylcatalog.com';

    console.log(`Updating password for ${email}...`);

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 12);

    // Update the user
    const user = await prisma.adminUser.update({
      where: { email },
      data: { passwordHash },
    });

    console.log('✅ Password updated successfully');
    console.log(`Email: ${user.email}`);
    console.log(`Password: ${password}`);
    console.log(`Hash: ${passwordHash.substring(0, 20)}...`);
  } catch (error) {
    console.error('❌ Error updating password:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

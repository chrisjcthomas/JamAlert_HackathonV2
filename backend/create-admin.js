// Create Initial Admin User
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('🔐 Creating admin user...\n');

    const email = process.env.ADMIN_EMAIL || 'admin@jamalert.com';
    const password = process.env.ADMIN_PASSWORD;
    const name = 'System Administrator';

    if (!password) {
      console.error('❌ Error: ADMIN_PASSWORD environment variable is required.');
      console.error('   Please set ADMIN_PASSWORD and try again.');
      process.exit(1);
    }

    // Check if admin already exists
    const existing = await prisma.adminUser.findUnique({
      where: { email }
    });

    if (existing) {
      console.log('ℹ️  Admin user already exists:', email);
      console.log('   ID:', existing.id);
      console.log('   Name:', existing.name);
      console.log('   Role:', existing.role);
      console.log('   Active:', existing.isActive);
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin user
    const admin = await prisma.adminUser.create({
      data: {
        email,
        passwordHash,
        name,
        role: 'ADMIN',
        isActive: true
      }
    });

    console.log('✅ Admin user created successfully!\n');
    console.log('📧 Email:', email);
    console.log('👤 Name:', name);
    console.log('🆔 User ID:', admin.id);
    console.log('📅 Created:', admin.createdAt);
    console.log('\n⚠️  IMPORTANT: Change the password after first login!\n');

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    if (error.code === 'P1001') {
      console.error('\n💡 Database connection failed. Check:');
      console.error('   - DATABASE_URL environment variable is set');
      console.error('   - Database server is accessible');
      console.error('   - Firewall allows connections');
    } else if (error.code === 'P2002') {
      console.error('\n💡 Admin user already exists with this email');
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

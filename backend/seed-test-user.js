#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    console.log('🌱 Creating test user and company...');

    // Check if test user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    });

    if (existingUser) {
      console.log('✅ Test user already exists');
      return;
    }

    // Check if test company exists
    let testCompany = await prisma.company.findUnique({
      where: { tax_id: '12345678' }
    });

    // Create test user first
    const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
    const testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
        role: 'ADMIN',
        is_active: true
      }
    });

    if (!testCompany) {
      // Create test company with the user as owner
      testCompany = await prisma.company.create({
        data: {
          user_id: testUser.id,
          company_name: 'Test Company',
          tax_id: '12345678',
          address: '123 Test Street, Test City',
          phone: '555-0123',
          email: 'test@testcompany.com',
          capital: '1000000',
          website: 'https://testcompany.com'
        }
      });
      console.log('✅ Test company created:', testCompany.company_name);

      // Update user with company_id
      await prisma.user.update({
        where: { id: testUser.id },
        data: { company_id: testCompany.id }
      });
    }

    console.log('✅ Test user created successfully:');
    console.log('   Email: test@example.com');
    console.log('   Password: TestPassword123!');
    console.log('   Name: Test User');
    console.log('   Role: ADMIN');
    console.log('   Company:', testCompany.company_name);

  } catch (error) {
    console.error('❌ Error creating test user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser()
  .catch((error) => {
    console.error('Failed to create test user:', error);
    process.exit(1);
  });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔍 Testing Prisma connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Connected to database successfully');
    
    // Count users
    const userCount = await prisma.user.count();
    console.log(`👥 Users in database: ${userCount}`);
    
    // Count assets
    const assetCount = await prisma.asset.count();
    console.log(`📊 Assets in database: ${assetCount}`);
    
    console.log('🎉 Prisma is working correctly!');
    
  } catch (error) {
    console.error('❌ Prisma connection failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
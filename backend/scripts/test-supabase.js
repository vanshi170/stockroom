const { PrismaClient } = require('@prisma/client');

async function testConnections() {
  const directUrl = 'postgresql://postgres:Waheguru%4012345%40@db.zywygddjgldtuwtmxlco.supabase.co:5432/postgres';
  const poolerTxUrl = 'postgresql://postgres.zywygddjgldtuwtmxlco:Waheguru%4012345%40@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
  const poolerSessionUrl = 'postgresql://postgres.zywygddjgldtuwtmxlco:Waheguru%4012345%40@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres';

  console.log('--- 1. Testing Supabase Direct Connection (db.zywygddjgldtuwtmxlco.supabase.co:5432) ---');
  try {
    const prisma1 = new PrismaClient({ datasources: { db: { url: directUrl } } });
    await prisma1.$queryRaw`SELECT 1 as result`;
    console.log('✓ Supabase Direct connection: CONNECTED SUCCESSFULLY!');
    await prisma1.$disconnect();
  } catch (err) {
    console.log('Note on Direct (IPv6):', err.message);
  }

  console.log('\n--- 2. Testing Supabase Pooler Transaction Mode (Port 6543) ---');
  try {
    const prisma2 = new PrismaClient({ datasources: { db: { url: poolerTxUrl } } });
    await prisma2.$queryRaw`SELECT 1 as result`;
    console.log('✓ Supabase Pooler Transaction mode (6543): CONNECTED SUCCESSFULLY!');
    await prisma2.$disconnect();
  } catch (err) {
    console.log('Pooler Tx Error:', err.message);
  }

  console.log('\n--- 3. Testing Supabase Pooler Session Mode (Port 5432) for Migrations/Direct ---');
  try {
    const prisma3 = new PrismaClient({ datasources: { db: { url: poolerSessionUrl } } });
    await prisma3.$queryRaw`SELECT 1 as result`;
    console.log('✓ Supabase Pooler Session mode (5432): CONNECTED SUCCESSFULLY!');
    await prisma3.$disconnect();
  } catch (err) {
    console.log('Pooler Session Error:', err.message);
  }
}

testConnections();

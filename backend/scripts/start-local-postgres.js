const EmbeddedPostgres = require('embedded-postgres');
const path = require('path');
const { execSync } = require('child_process');

async function start() {
  console.log('Initializing local embedded PostgreSQL...');
  const dbDir = path.resolve(__dirname, '../.data/postgres');

  const pg = new (EmbeddedPostgres.default || EmbeddedPostgres)({
    databaseDir: dbDir,
    user: 'postgres',
    password: 'password',
    port: 5432,
    persistent: true,
  });

  try {
    await pg.initialise();
    console.log('Postgres cluster initialized.');
  } catch (err) {
    console.log('Cluster already initialized or message:', err.message);
  }

  console.log('Starting PostgreSQL server...');
  await pg.start();
  console.log('PostgreSQL running on localhost:5432 with user: postgres, password: password');

  try {
    await pg.createDatabase('stockroom');
    console.log('Database "stockroom" created.');
  } catch (err) {
    console.log('Database may already exist:', err.message);
  }

  const databaseUrl = 'postgresql://postgres:password@localhost:5432/stockroom?schema=public';
  console.log('Applying Prisma migrations...');
  execSync('npx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl },
    stdio: 'inherit',
  });

  console.log('Seeding database with sample inventory records...');
  execSync('node prisma/seed.js', {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl },
    stdio: 'inherit',
  });

  console.log('\n======================================================');
  console.log('LOCAL POSTGRESQL & SEEDED DATABASE READY FOR TESTING!');
  console.log('DATABASE_URL=' + databaseUrl);
  console.log('======================================================\n');
}

start().catch((err) => {
  console.error('Error starting embedded postgres:', err);
  process.exit(1);
});


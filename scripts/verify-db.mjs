import path from 'node:path';
import dotenv from 'dotenv';
import pg from 'pg';

const { Client } = pg;

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL missing.');
  process.exit(1);
}

/**
 * Verifies applied migrations, public tables, RLS status, and template seed counts.
 */
async function verifyDatabase() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    const migrations = await client.query(
      'SELECT version, name, applied_at FROM public.schema_migrations ORDER BY version'
    );
    const tables = await client.query(`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    const templateCount = await client.query('SELECT COUNT(*)::int AS total FROM public.gdd_templates');
    const policies = await client.query(`
      SELECT tablename, COUNT(*)::int AS policy_count
      FROM pg_policies
      WHERE schemaname = 'public'
      GROUP BY tablename
      ORDER BY tablename
    `);

    console.log('Applied migrations:', migrations.rows);
    console.log('Public tables & RLS:', tables.rows);
    console.log('RLS policy counts:', policies.rows);
    console.log('Seeded templates count:', templateCount.rows[0]?.total);
  } finally {
    await client.end();
  }
}

verifyDatabase().catch((err) => {
  console.error(err);
  process.exit(1);
});

import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import pg from 'pg';

const { Client } = pg;

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set in .env.local or environment.');
  process.exit(1);
}

/**
 * Runs all pending SQL migration files inside supabase/migrations in lexical order.
 */
async function runMigrations() {
  const migrationsDir = path.resolve(process.cwd(), 'supabase', 'migrations');
  const entries = await fs.readdir(migrationsDir);
  const sqlFiles = entries.filter((f) => f.endsWith('.sql')).sort();

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected to Supabase PostgreSQL directly.');

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.schema_migrations (
        version TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    const appliedRes = await client.query('SELECT version FROM public.schema_migrations');
    const appliedVersions = new Set(appliedRes.rows.map((r) => r.version));

    for (const file of sqlFiles) {
      const version = file.split('_')[0];
      if (appliedVersions.has(version)) {
        console.log(`SKIP ${file} (already applied)`);
        continue;
      }

      const fullPath = path.join(migrationsDir, file);
      const sql = await fs.readFile(fullPath, 'utf8');
      console.log(`APPLY ${file}...`);

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO public.schema_migrations (version, name) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING',
          [version, file]
        );
        await client.query('COMMIT');
        console.log(`DONE ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`FAILED ${file}:`, err);
        throw err;
      }
    }

    console.log('All migrations completed successfully.');
  } finally {
    await client.end();
  }
}

runMigrations().catch((err) => {
  console.error(err);
  process.exit(1);
});

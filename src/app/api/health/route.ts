import { NextResponse } from 'next/server';
import pg from 'pg';

const { Pool } = pg;

let healthPool: pg.Pool | null = null;

function getHealthPool(): pg.Pool | null {
  if (!process.env.DATABASE_URL) return null;
  if (!healthPool) {
    healthPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 2,
      idleTimeoutMillis: 10_000,
    });
  }
  return healthPool;
}

/**
 * Health check endpoint verifying Next.js server and Supabase PostgreSQL connectivity.
 */
export async function GET() {
  const pool = getHealthPool();
  let dbStatus: 'connected' | 'unconfigured' | 'error' = 'unconfigured';

  if (pool) {
    try {
      await pool.query('SELECT 1');
      dbStatus = 'connected';
    } catch {
      dbStatus = 'error';
    }
  }

  return NextResponse.json(
    {
      status: dbStatus === 'error' ? 'degraded' : 'ok',
      service: 'AgentGDD',
      database: dbStatus,
      timestamp: new Date().toISOString(),
    },
    { status: dbStatus === 'error' ? 503 : 200 }
  );
}

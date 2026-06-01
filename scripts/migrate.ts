/**
 * Database migration runner.
 *
 * Usage:
 *   1. Add DATABASE_URL to your .env (Supabase dashboard → Project Settings → Database → Connection string)
 *   2. Run:  npx tsx scripts/migrate.ts
 *
 * Splits the SQL file into individual statements and runs them in order.
 * Safe to re-run: each statement is idempotent (uses IF NOT EXISTS / DROP IF EXISTS).
 */
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

// Lightweight .env loader — no extra deps. Run with: npx tsx scripts/migrate.ts
// (tsx auto-loads .env in newer versions; this is a fallback for older ones.)
function loadEnv() {
  const envPath = join(process.cwd(), '.env');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // Strip surrounding quotes.
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnv();

const SUPABASE_PROJECT_REF = 'avnhelsrtwxgzrmeymuo';

async function main() {
  let connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    // Supabase has a default postgres password format. Try the most common pooler URL.
    const dbPassword = process.env.SUPABASE_DB_PASSWORD;
    if (dbPassword) {
      connectionString = `postgresql://postgres.${SUPABASE_PROJECT_REF}:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
      console.log('[migrate] Using pooler connection (ap-southeast-1).');
    } else {
      console.error('No DATABASE_URL or SUPABASE_DB_PASSWORD set in .env');
      console.error('');
      console.error('Get the connection string from:');
      console.error(`  Supabase Dashboard → Project (${SUPABASE_PROJECT_REF}) → Settings → Database`);
      console.error('Copy "Connection string" (Transaction mode, port 6543) and set as DATABASE_URL');
      process.exit(1);
    }
  }

  const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.error('No migration files found in', migrationsDir);
    process.exit(1);
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('[migrate] Connected to Postgres.');

  for (const file of files) {
    const filePath = join(migrationsDir, file);
    const sql = readFileSync(filePath, 'utf-8');
    console.log(`[migrate] Applying ${file}…`);

    try {
      // Supabase / pg can run multi-statement SQL in one query() call.
      await client.query(sql);
      console.log(`[migrate] ✓ ${file} applied.`);
    } catch (err: any) {
      console.error(`[migrate] ✗ ${file} failed:`, err.message);
      console.error('Position:', err.position);
      throw err;
    }
  }

  await client.end();
  console.log('[migrate] All migrations applied successfully.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

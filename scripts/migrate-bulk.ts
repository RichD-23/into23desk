/**
 * Apply the migration by POSTing the entire .sql as a single query.
 * Fallback when per-statement splitting is wrong (e.g. DO $$...$$).
 */
import { readFileSync } from 'fs';
import { join } from 'path';

async function main() {
  const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
  if (!TOKEN) {
    console.error('SUPABASE_ACCESS_TOKEN not set');
    process.exit(1);
  }

  const file = join(process.cwd(), 'supabase/migrations/20260510150000_initial_schema.sql');
  const sql = readFileSync(file, 'utf-8');

  console.log(`[migrate-bulk] POST ${sql.length} bytes of SQL…`);

  const res = await fetch(
    'https://api.supabase.com/v1/projects/avnhelsrtwxgzrmeymuo/database/query',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  const text = await res.text();
  console.log(`[migrate-bulk] HTTP ${res.status}`);
  console.log(text.slice(0, 2000));
  if (!res.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Apply a single migration via the Supabase management API.
 * Usage: SUPABASE_ACCESS_TOKEN=sbp_... npx tsx scripts/apply-migration.ts <file>
 */
import { readFileSync } from 'fs';

async function main() {
  const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
  if (!TOKEN) {
    console.error('SUPABASE_ACCESS_TOKEN is not set in env');
    process.exit(1);
  }
  const REF = process.env.SUPABASE_PROJECT_REF || 'avnhelsrtwxgzrmeymuo';
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: npx tsx scripts/apply-migration.ts <migration-file>');
    process.exit(1);
  }

  const sql = readFileSync(file, 'utf-8');
  console.log(`[apply] POST ${sql.length} bytes from ${file}…`);

  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ query: sql }),
  });

  const text = await res.text();
  console.log(`[apply] HTTP ${res.status}`);
  console.log(text.slice(0, 2000));
  if (!res.ok) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });

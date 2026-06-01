/**
 * Apply the Supabase schema migration via the management API.
 * Uses a Personal Access Token (sbp_...) for auth — no DB password needed.
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_... npx tsx scripts/migrate-api.ts
 *
 * Splits the SQL file on semicolons at the top level (careful with $$...$$
 * function bodies and DO blocks) and runs each statement.
 */
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const PROJECT_REF = 'avnhelsrtwxgzrmeymuo';
const API_BASE = 'https://api.supabase.com/v1';

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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnv();

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!ACCESS_TOKEN) {
  console.error('SUPABASE_ACCESS_TOKEN is not set.');
  console.error('Generate one at https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

/**
 * Split a SQL script into individual statements.
 * - Respects $$...$$ dollar-quoted blocks (Postgres function bodies).
 * - Respects single-quoted strings (no escaped single quotes for simplicity).
 * - Splits on `;` followed by whitespace or end-of-file.
 */
function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let buf = '';
  let i = 0;
  let inSingle = false;
  let inDollar = false;
  let dollarTag = '';

  while (i < sql.length) {
    const ch = sql[i];

    // Detect start of dollar-quote
    if (!inSingle && ch === '$') {
      const rest = sql.slice(i);
      const m = rest.match(/^\$([A-Za-z0-9_]*)\$/);
      if (m) {
        if (!inDollar) {
          inDollar = true;
          dollarTag = m[0];
          buf += m[0];
          i += m[0].length;
          continue;
        } else if (rest.startsWith(dollarTag)) {
          inDollar = false;
          dollarTag = '';
          buf += dollarTag;
          i += dollarTag.length;
          continue;
        }
      }
    }

    if (!inDollar) {
      if (ch === "'" && sql[i - 1] !== '\\') {
        inSingle = !inSingle;
      }
    }

    if (ch === ';' && !inSingle && !inDollar) {
      const trimmed = buf.trim();
      if (trimmed.length > 0) statements.push(trimmed);
      buf = '';
      i++;
      continue;
    }

    buf += ch;
    i++;
  }

  const tail = buf.trim();
  if (tail.length > 0) statements.push(tail);

  return statements;
}

async function runQuery(query: string): Promise<any> {
  const res = await fetch(`${API_BASE}/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ query }),
  });

  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const err: any = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return data;
}

async function main() {
  const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.error('No migration files in', migrationsDir);
    process.exit(1);
  }

  // Verify access first.
  console.log(`[migrate-api] Verifying access to project ${PROJECT_REF}…`);
  const projectRes = await fetch(`${API_BASE}/projects/${PROJECT_REF}`, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });
  if (!projectRes.ok) {
    const body = await projectRes.text();
    console.error(`[migrate-api] ✗ Cannot access project (HTTP ${projectRes.status}):`, body);
    process.exit(1);
  }
  const project = await projectRes.json();
  console.log(`[migrate-api] ✓ Connected to project "${project.name}" (region: ${project.region})`);

  for (const file of files) {
    const filePath = join(migrationsDir, file);
    const sql = readFileSync(filePath, 'utf-8');
    const statements = splitStatements(sql);
    console.log(`[migrate-api] ${file}: ${statements.length} statements to apply`);

    for (let idx = 0; idx < statements.length; idx++) {
      const stmt = statements[idx];
      const preview = stmt.replace(/\s+/g, ' ').slice(0, 80);
      process.stdout.write(`  [${idx + 1}/${statements.length}] ${preview}… `);
      try {
        await runQuery(stmt + ';');
        process.stdout.write('✓\n');
      } catch (err: any) {
        process.stdout.write('✗\n');
        console.error(`    Error: ${err.message}`);
        if (err.body) console.error('    Body:', JSON.stringify(err.body, null, 2));
        throw err;
      }
    }
  }

  console.log('\n[migrate-api] All migrations applied successfully.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

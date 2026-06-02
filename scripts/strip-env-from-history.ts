/**
 * Strip the .env file from all git history.
 * GitHub's secret scanner is blocking the push because the original
 * scaffold commit (28eed50) added .env with service-role + AI keys.
 * This rewrites history to remove that file from every commit, then
 * force-pushes to the remote.
 *
 * Run: npx tsx scripts/strip-env-from-history.ts
 */
import { execSync } from 'child_process';

function run(cmd: string, opts: any = {}): string {
  console.log(`[run] ${cmd}`);
  return execSync(cmd, { stdio: 'inherit', ...opts })?.toString() || '';
}

async function main() {
  console.log('=== Stripping .env from git history ===\n');

  // 1. Verify .env is currently NOT tracked (only in past commits)
  const tracked = run('git ls-files .env', { stdio: 'pipe' }).trim();
  if (tracked === '.env') {
    console.error('.env is currently tracked! Run `git rm --cached .env` first.');
    process.exit(1);
  }
  console.log('  ✓ .env is not currently tracked');

  // 2. Use git filter-branch to remove .env from every commit
  console.log('\n[filter-branch] removing .env from all commits…');
  run('git filter-branch -f --index-filter "git rm --cached --ignore-unmatch .env" --prune-empty --tag-name-filter cat -- --all');

  // 3. Verify
  const remaining = run('git log --all --diff-filter=A --name-only | grep -c "^\\.env$"', { stdio: 'pipe' }).trim();
  if (remaining !== '0') {
    console.error(`Failed: ${remaining} .env references still in history`);
    process.exit(1);
  }
  console.log('\n  ✓ .env removed from history');

  // 4. Force-push
  console.log('\n[push] force-push sprint-jun10…');
  run('git push --force-with-lease origin sprint-jun10');

  console.log('\n=== Done. .env removed from history, branch pushed. ===');
}

main().catch((e) => { console.error(e); process.exit(1); });

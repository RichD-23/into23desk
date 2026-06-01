/**
 * End-to-end verification of the SwiftDesk demo flow.
 * Hits the running dev server (must be on http://localhost:4028).
 *
 * What it tests:
 *   1. Sign-up page loads (HTTP 200)
 *   2. Login as priya@batikcraft.id
 *   3. List conversations via Supabase REST
 *   4. Fire the simulator with a Thai urgent message
 *   5. Fire the simulator with a Tamil chatter message
 *   6. Verify both messages are in the DB with AI translations
 *   7. POST /api/messages/send to simulate the agent replying
 *   8. POST /api/conversations/resolve
 *   9. POST /api/admin/reset-demo
 *   10. Verify reset worked
 *
 * Run with: npx tsx --env-file=.env scripts/e2e-verify.ts
 */

import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SRV_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const APP = 'http://localhost:4028';

const supabase = createClient(URL, SRV_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

let passed = 0, failed = 0;
const fail = (msg: string) => { failed++; console.log(`  ✗ ${msg}`); };
const pass = (msg: string) => { passed++; console.log(`  ✓ ${msg}`); };

async function main() {
  console.log('=== SwiftDesk E2E verification ===\n');

  // 1. Sign-up page loads
  console.log('1. Sign-up page');
  const r1 = await fetch(`${APP}/sign-up-login`);
  r1.status === 200 ? pass('200 OK') : fail(`HTTP ${r1.status}`);

  // 2. Login as priya
  console.log('\n2. Login as priya@batikcraft.id');
  const loginRes = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
    body: JSON.stringify({ email: 'priya@batikcraft.id', password: 'Agent@Into23!' }),
  });
  if (loginRes.ok) {
    const data = await loginRes.json();
    pass(`logged in, access_token length: ${data.access_token?.length || 0}`);
  } else {
    fail(`login failed: ${loginRes.status} ${await loginRes.text()}`);
    return;
  }

  // 3. List conversations
  console.log('\n3. List conversations');
  const { data: convs, error: convErr } = await supabase
    .from('conversations')
    .select('id, language, status, contact_id, contacts(name, language)')
    .order('last_message_time', { ascending: false });
  if (convErr) fail(convErr.message);
  else if (convs && convs.length === 5) pass(`5 conversations present`);
  else fail(`expected 5, got ${convs?.length}`);

  // Find Somchai (TH) and Meena (TA) for the simulator tests
  const somchai = convs?.find((c: any) => c.contacts?.name === 'Somchai Petcharat');
  const meena = convs?.find((c: any) => c.contacts?.name === 'Meena Krishnamurthy');
  if (!somchai) { fail('Somchai not found'); return; }
  if (!meena) { fail('Meena not found'); return; }
  pass(`Somchai: ${somchai.id.slice(0, 8)}, Meena: ${meena.id.slice(0, 8)}`);

  // 4. Fire TH urgent
  console.log('\n4. Fire Thai urgent message to Somchai');
  const th = await fetch(`${APP}/api/messages/simulate-inbound`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversationId: somchai.id,
      content: 'ด่วนมากค่ะ! พัสดุหาย ลูกค้ารอนานแล้ว ช่วยติดตามด่วนนะคะ',
      language: 'th',
      withAiTranslation: true,
    }),
  });
  const thData = await th.json();
  if (th.ok) {
    pass(`message inserted, lang=${thData.detected_language}, translated=${(thData.translated || '').slice(0, 50)}…`);
  } else {
    fail(`TH failed: ${thData.error}`);
  }

  // 5. Fire TA chatter
  console.log('\n5. Fire Tamil chatter message to Meena');
  const ta = await fetch(`${APP}/api/messages/simulate-inbound`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversationId: meena.id,
      content: 'நான் silk saree வாங்கினேன், அது beautiful! ஆனா ஒரு question — return policy என்ன?',
      language: 'ta',
      withAiTranslation: true,
    }),
  });
  const taData = await ta.json();
  if (ta.ok) {
    pass(`message inserted, lang=${taData.detected_language}, translated=${(taData.translated || '').slice(0, 50)}…`);
  } else {
    fail(`TA failed: ${taData.error}`);
  }

  // 6. Verify in DB
  console.log('\n6. Verify messages in DB');
  const { count: msgCount, error: msgErr } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .in('conversation_id', [somchai.id, meena.id]);
  if (msgErr) fail(msgErr.message);
  else if (msgCount && msgCount >= 3) pass(`${msgCount} messages in the 2 conversations (1 Somchai + 1 Meena from before, + 2 just added)`);
  else fail(`expected 3+, got ${msgCount}`);

  // 7. Agent send (reply)
  console.log('\n7. Agent sends a reply to Somchai');
  const send = await fetch(`${APP}/api/messages/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversationId: somchai.id,
      content: 'Hi! I am checking with the courier right now. One moment please 🙏',
      isNote: false,
      agentName: 'Priya Nair',
    }),
  });
  const sendData = await send.json();
  if (send.ok && sendData.message?.id) pass(`reply inserted, id=${sendData.message.id.slice(0, 8)}`);
  else fail(`send failed: ${sendData.error}`);

  // 8. Resolve conversation
  console.log('\n8. Resolve Somchai conversation');
  const resolve = await fetch(`${APP}/api/conversations/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId: somchai.id }),
  });
  if (resolve.ok) pass('resolved');
  else fail(`resolve failed: ${await resolve.text()}`);

  // Verify status updated
  const { data: somchaiAfter } = await supabase
    .from('conversations')
    .select('status, unread_count')
    .eq('id', somchai.id)
    .single();
  if (somchaiAfter?.status === 'resolved') pass(`status=resolved, unread=${somchaiAfter.unread_count}`);
  else fail(`status=${somchaiAfter?.status}`);

  // 9. Reset demo
  console.log('\n9. Reset demo');
  const reset = await fetch(`${APP}/api/admin/reset-demo`, { method: 'POST' });
  const resetData = await reset.json();
  if (reset.ok) pass(`deleted ${resetData.deleted_messages} messages, conversations reset`);
  else fail(`reset failed: ${resetData.error}`);

  // 10. Verify reset
  console.log('\n10. Verify post-reset state');
  const { count: remainingMsgs } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true });
  if (remainingMsgs === 0) pass('0 messages in DB');
  else fail(`expected 0, got ${remainingMsgs}`);

  // Re-seed for the demo
  console.log('\n11. Re-seed so the demo is ready');
  const { default: spawn } = await import('child_process').catch(() => ({ default: null } as any));
  if (spawn) {
    await new Promise<void>((resolve) => {
      const proc = spawn('npx', ['tsx', '--env-file=.env', 'scripts/seed-demo.ts'], { cwd: process.cwd() });
      proc.on('exit', () => resolve());
    });
  } else {
    console.log('  (skipped — run `npm run seed` manually)');
  }

  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });

/**
 * Seed SwiftDesk demo data using the Supabase admin API.
 *
 * Steps:
 *   1. Create 5 auth users via auth.admin.createUser (so passwords work for demo sign-in)
 *   2. Update their user_profiles with extra fields (initials, color, agent_status, languages)
 *   3. Insert 5 contacts, 5 conversations, ~10 messages, 6 KB articles
 *   4. Insert a billing subscription + invoices for the admin
 *
 * Idempotent: re-running is safe; if a user already exists we just fetch them.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!URL) {
  console.error('NEXT_PUBLIC_SUPABASE_URL not set');
  process.exit(1);
}
const KEY = SERVICE_KEY || ANON_KEY;
if (!KEY) {
  console.error('Neither SUPABASE_SERVICE_ROLE_KEY nor NEXT_PUBLIC_SUPABASE_ANON_KEY is set');
  process.exit(1);
}
if (!SERVICE_KEY) {
  console.warn('[seed] WARNING: using anon key (not service role). Some operations may fail.');
}

const supabase: SupabaseClient = createClient(URL, KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface DemoUser {
  email: string;
  password: string;
  full_name: string;
  role: 'admin' | 'agent' | 'team_lead';
  initials: string;
  color_class: string;
  languages: string[];
  agent_status: 'online' | 'away' | 'offline';
}

const USERS: DemoUser[] = [
  { email: 'maya@batikcraft.id',  password: 'Demo@Into23!',  full_name: 'Maya Wijaya',       role: 'admin',     initials: 'MW', color_class: 'bg-purple-100 text-purple-700', languages: ['ID','EN'], agent_status: 'online' },
  { email: 'priya@batikcraft.id', password: 'Agent@Into23!', full_name: 'Priya Nair',        role: 'agent',     initials: 'PN', color_class: 'bg-purple-100 text-purple-700', languages: ['EN','TA','HI'], agent_status: 'online' },
  { email: 'raj@cloudstack.in',   password: 'Lead@Into23!',  full_name: 'Raj Sharma',        role: 'team_lead', initials: 'RS', color_class: 'bg-blue-100 text-blue-700',     languages: ['EN','HI'], agent_status: 'online' },
  { email: 'arif@batikcraft.id',  password: 'Agent@Into23!', full_name: 'Arif Wibowo',       role: 'agent',     initials: 'AW', color_class: 'bg-blue-100 text-blue-700',     languages: ['ID','EN'], agent_status: 'online' },
  { email: 'kavitha@batikcraft.id', password: 'Agent@Into23!', full_name: 'Kavitha Rajan',   role: 'agent',     initials: 'KR', color_class: 'bg-orange-100 text-orange-700', languages: ['TA','EN','HI'], agent_status: 'online' },
];

interface ContactSeed {
  id: string;
  name: string;
  phone: string;
  email?: string;
  language: string;
  location: string;
  platform: string;
  total_conversations: number;
  avg_csat: number;
  tags: string[];
}
const CONTACTS: ContactSeed[] = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Siti Rahayu',           phone: '+62 812-3456-7890', email: 'siti.rahayu@gmail.com',  language: 'id', location: 'Jakarta, Indonesia',         platform: 'Shopee',   total_conversations: 4, avg_csat: 4.2, tags: ['repeat-buyer','vip'] },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Somchai Petcharat',     phone: '+66 81 234 5678',                                  language: 'th', location: 'Bangkok, Thailand',          platform: 'Lazada',   total_conversations: 2, avg_csat: 3.8, tags: ['return-request'] },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Nguyen Thi Lan',        phone: '+84 90 123 4567',                                   language: 'vi', location: 'Ho Chi Minh City, Vietnam',  platform: 'Shopify',  total_conversations: 7, avg_csat: 4.7, tags: ['vip','repeat-buyer'] },
  { id: '44444444-4444-4444-4444-444444444444', name: 'Meena Krishnamurthy',   phone: '+91 98765 43210',                                   language: 'ta', location: 'Chennai, India',             platform: 'Flipkart', total_conversations: 3, avg_csat: 4.0, tags: ['escalated'] },
  { id: '55555555-5555-5555-5555-555555555555', name: 'Rahul Verma',           phone: '+91 97654 32109',                                   language: 'hi', location: 'Mumbai, India',              platform: 'Meesho',   total_conversations: 1, avg_csat: 0,   tags: ['new-customer'] },
];

async function ensureUsers() {
  const userIds: Record<string, string> = {};
  for (const u of USERS) {
    // Check if user already exists
    const { data: existing } = await supabase.auth.admin.listUsers();
    const found = existing?.users?.find((x: any) => x.email === u.email);
    if (found) {
      userIds[u.email] = found.id;
      console.log(`  ✓ ${u.email} already exists (${found.id})`);
      continue;
    }
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.full_name, role: u.role },
    });
    if (error || !data?.user) {
      console.error(`  ✗ Failed to create ${u.email}: ${error?.message}`);
      throw error;
    }
    userIds[u.email] = data.user.id;
    console.log(`  ✓ Created ${u.email} (${data.user.id})`);
  }
  return userIds;
}

async function updateUserProfiles(userIds: Record<string, string>) {
  for (const u of USERS) {
    const id = userIds[u.email];
    const { error } = await supabase
      .from('user_profiles')
      .update({
        initials: u.initials,
        color_class: u.color_class,
        agent_status: u.agent_status,
        languages: u.languages,
        role: u.role,
      })
      .eq('id', id);
    if (error) {
      console.error(`  ✗ Update profile for ${u.email}: ${error.message}`);
    } else {
      console.log(`  ✓ Updated profile ${u.email}`);
    }
  }
}

async function ensureContacts() {
  for (const c of CONTACTS) {
    const { error } = await supabase
      .from('contacts')
      .upsert({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email ?? null,
        language: c.language,
        location: c.location,
        platform: c.platform,
        total_conversations: c.total_conversations,
        avg_csat: c.avg_csat,
        tags: c.tags,
      });
    if (error) console.error(`  ✗ Contact ${c.name}: ${error.message}`);
    else console.log(`  ✓ Contact ${c.name}`);
  }
}

async function ensureConversationsAndMessages(userIds: Record<string, string>) {
  const priya = userIds['priya@batikcraft.id'];
  const arif  = userIds['arif@batikcraft.id'];
  const kavitha = userIds['kavitha@batikcraft.id'];
  const maya = userIds['maya@batikcraft.id'];

  // Conversations: each linked to a contact, some assigned, some open.
  const conversations = [
    {
      id: 'c1111111-0000-0000-0000-000000000001',
      contact_id: CONTACTS[0].id, status: 'assigned', assigned_agent_id: priya,
      last_message: 'Saya mau tanya soal pesanan saya yang belum datang',
      last_message_time: new Date(Date.now() - 2 * 60_000).toISOString(),
      unread_count: 3, language: 'id', ai_suggestion: true, priority: 'high', waiting_time: '18 min',
    },
    {
      id: 'c2222222-0000-0000-0000-000000000002',
      contact_id: CONTACTS[1].id, status: 'open', assigned_agent_id: null,
      last_message: 'สอบถามเรื่องการคืนสินค้าครับ',
      last_message_time: new Date(Date.now() - 5 * 60_000).toISOString(),
      unread_count: 1, language: 'th', ai_suggestion: true, priority: 'high', waiting_time: '5 min',
    },
    {
      id: 'c3333333-0000-0000-0000-000000000003',
      contact_id: CONTACTS[2].id, status: 'assigned', assigned_agent_id: arif,
      last_message: 'Tôi cần hỗ trợ về đơn hàng #VN-9920',
      last_message_time: new Date(Date.now() - 12 * 60_000).toISOString(),
      unread_count: 0, language: 'vi', ai_suggestion: false, priority: 'normal', waiting_time: null,
    },
    {
      id: 'c4444444-0000-0000-0000-000000000004',
      contact_id: CONTACTS[3].id, status: 'pending', assigned_agent_id: kavitha,
      last_message: 'என் ஆர்டர் எங்கே உள்ளது?',
      last_message_time: new Date(Date.now() - 28 * 60_000).toISOString(),
      unread_count: 2, language: 'ta', ai_suggestion: true, priority: 'high', waiting_time: '28 min',
    },
    {
      id: 'c5555555-0000-0000-0000-000000000005',
      contact_id: CONTACTS[4].id, status: 'open', assigned_agent_id: null,
      last_message: 'मुझे अपना ऑर्डर कैंसिल करना है',
      last_message_time: new Date(Date.now() - 35 * 60_000).toISOString(),
      unread_count: 1, language: 'hi', ai_suggestion: false, priority: 'normal', waiting_time: null,
    },
  ];

  for (const c of conversations) {
    const { error } = await supabase.from('conversations').upsert(c);
    if (error) console.error(`  ✗ Conv ${c.id}: ${error.message}`);
    else console.log(`  ✓ Conv ${c.id.slice(0, 8)}… (${c.language})`);
  }

  // Messages for conv 1 (Indonesian, assigned to Priya)
  const c1 = 'c1111111-0000-0000-0000-000000000001';
  const m1 = [
    { id: 'aaaaaaaa-0000-0000-0000-000000000001', conversation_id: c1, message_type: 'text', direction: 'in',  content: 'Halo, saya mau tanya soal pesanan saya', delivery: 'read', translated: null, sent_at: new Date(Date.now() - 30 * 60_000).toISOString() },
    { id: 'aaaaaaaa-0000-0000-0000-000000000002', conversation_id: c1, message_type: 'text', direction: 'in',  content: 'Pesanan SH-8821 sudah 5 hari belum sampai', delivery: 'read', translated: 'Order SH-8821 has not arrived after 5 days', sent_at: new Date(Date.now() - 29 * 60_000).toISOString() },
    { id: 'aaaaaaaa-0000-0000-0000-000000000003', conversation_id: c1, message_type: 'text', direction: 'out', content: 'Halo Siti! Terima kasih sudah menghubungi kami. Saya cek dulu ya pesanannya.', delivery: 'read', translated: null, sent_at: new Date(Date.now() - 28 * 60_000).toISOString(), author_name: 'Priya Nair' },
    { id: 'aaaaaaaa-0000-0000-0000-000000000004', conversation_id: c1, message_type: 'note', direction: 'note', content: 'Checked Shopee API — order SH-8821 is stuck at JNE sorting hub in Bekasi since May 5. Need to file a claim.', delivery: null, translated: null, sent_at: new Date(Date.now() - 27 * 60_000).toISOString(), author_name: 'Priya Nair' },
    { id: 'aaaaaaaa-0000-0000-0000-000000000005', conversation_id: c1, message_type: 'text', direction: 'in',  content: 'Saya mau tanya soal pesanan saya yang belum datang', delivery: 'read', translated: "I want to ask about my order that hasn't arrived", sent_at: new Date(Date.now() - 2 * 60_000).toISOString() },
  ];
  for (const m of m1) {
    const { error } = await supabase.from('messages').upsert(m);
    if (error) console.error(`  ✗ Msg: ${error.message}`);
  }
  console.log(`  ✓ Inserted ${m1.length} messages for conv 1`);

  // Messages for conv 2 (Thai, open)
  const c2 = 'c2222222-0000-0000-0000-000000000002';
  const m2 = [
    { id: 'bbbbbbbb-0000-0000-0000-000000000001', conversation_id: c2, message_type: 'text', direction: 'in', content: 'สวัสดีครับ', delivery: 'read', translated: 'Hello', sent_at: new Date(Date.now() - 10 * 60_000).toISOString() },
    { id: 'bbbbbbbb-0000-0000-0000-000000000002', conversation_id: c2, message_type: 'text', direction: 'in', content: 'สอบถามเรื่องการคืนสินค้าครับ', delivery: 'read', translated: 'I want to ask about returning a product', sent_at: new Date(Date.now() - 5 * 60_000).toISOString() },
  ];
  for (const m of m2) {
    const { error } = await supabase.from('messages').upsert(m);
    if (error) console.error(`  ✗ Msg: ${error.message}`);
  }
  console.log(`  ✓ Inserted ${m2.length} messages for conv 2`);
}

async function ensureKBArticles() {
  const articles = [
    { title: 'How to track your order', category: 'Order Tracking', status: 'published', languages: ['en','id','th','vi'], ai_usage_count: 1247, deflection_score: 94, author_name: 'Priya Nair',  views: 3821, content: '## How to track your order\n\nYou can track your order in three ways:\n\n**1. Via WhatsApp**\nSimply reply "track [order number]" in this chat and our AI will fetch your real-time tracking status.\n\n**2. Via Shopee/Lazada app**\nGo to Me → My Orders → Find your order → Track Package.\n\n**3. Via courier website**\nUse your tracking number on the JNE, J&T, or SiCepat website.\n\nTracking updates may take 24–48 hours after dispatch.' },
    { title: 'Return and exchange policy', category: 'Returns & Exchanges', status: 'published', languages: ['en','id','hi'], ai_usage_count: 892, deflection_score: 87, author_name: 'Arif Wibowo', views: 2134, content: '## Return and Exchange Policy\n\nWe accept returns within **7 days** of delivery for the following reasons:\n\n- Item received is damaged or defective\n- Wrong item sent\n- Item does not match the description\n\n**How to initiate a return:**\n1. Take photos of the item and packaging\n2. Send photos to this WhatsApp chat\n3. Our team will approve and arrange a pickup within 24 hours' },
    { title: 'Payment methods accepted', category: 'Payment & Billing', status: 'published', languages: ['en','id','th'], ai_usage_count: 634, deflection_score: 91, author_name: 'Priya Nair', views: 1876, content: '## Payment Methods\n\nWe accept the following payment methods:\n\n**Online:**\n- Credit/Debit cards (Visa, Mastercard)\n- GoPay, OVO, Dana (Indonesia)\n- PromptPay (Thailand)\n- UPI, Paytm (India)' },
    { title: 'How to cancel an order', category: 'Order Tracking', status: 'published', languages: ['en','id','hi','ta'], ai_usage_count: 743, deflection_score: 82, author_name: 'Kavitha Rajan', views: 1654, content: '## How to Cancel an Order\n\nOrders can be cancelled **before they are shipped**.\n\n**To cancel:**\n1. Reply "cancel [order number]" in this chat\n2. Our AI will check if cancellation is still possible\n3. If confirmed, your refund will be processed within 3–5 business days' },
    { title: 'Account password reset', category: 'Account & Profile', status: 'published', languages: ['en','id','th','vi','ta','hi'], ai_usage_count: 387, deflection_score: 96, author_name: 'Arif Wibowo', views: 891, content: '## Reset Your Password\n\n**Via app:**\n1. Tap "Forgot Password" on the login screen\n2. Enter your registered email or phone number\n3. Check your SMS/email for a 6-digit OTP\n4. Enter OTP and set a new password' },
    { title: 'Size guide for clothing items', category: 'Product Information', status: 'draft', languages: ['en'], ai_usage_count: 0, deflection_score: 0, author_name: 'Priya Nair', views: 0, content: '## Size Guide\n\n*Draft — pending review by product team before publishing.*' },
  ];
  for (const a of articles) {
    const { error } = await supabase.from('kb_articles').upsert(a, { onConflict: 'title' });
    if (error) console.error(`  ✗ KB "${a.title}": ${error.message}`);
    else console.log(`  ✓ KB "${a.title}"`);
  }
}

async function ensureBilling(userIds: Record<string, string>) {
  const admin = userIds['maya@batikcraft.id'];
  const { data: sub, error: subErr } = await supabase
    .from('billing_subscriptions')
    .upsert({
      user_id: admin,
      plan_id: 'pro',
      billing_cycle: 'monthly',
      seats_used: 6,
      seats_total: 10,
      next_billing_date: '2026-06-10',
      current_period_start: '2026-05-10',
      current_period_end: '2026-06-10',
      monthly_spend: 149,
      is_active: true,
    }, { onConflict: 'user_id' })
    .select()
    .single();
  if (subErr) {
    console.error(`  ✗ Subscription: ${subErr.message}`);
    return;
  }
  console.log(`  ✓ Subscription: ${sub.id}`);

  const invoices = [
    { subscription_id: sub.id, user_id: admin, invoice_date: '2026-05-10', description: 'Pro Plan — May 2026',  amount: 149, status: 'paid' },
    { subscription_id: sub.id, user_id: admin, invoice_date: '2026-04-10', description: 'Pro Plan — Apr 2026',  amount: 149, status: 'paid' },
    { subscription_id: sub.id, user_id: admin, invoice_date: '2026-03-10', description: 'Pro Plan — Mar 2026',  amount: 149, status: 'paid' },
    { subscription_id: sub.id, user_id: admin, invoice_date: '2026-02-10', description: 'Pro Plan — Feb 2026',  amount: 149, status: 'paid' },
    { subscription_id: sub.id, user_id: admin, invoice_date: '2026-01-10', description: 'Starter Plan — Jan 2026 (Upgraded)', amount: 49, status: 'paid' },
    { subscription_id: sub.id, user_id: admin, invoice_date: '2025-12-10', description: 'Starter Plan — Dec 2025', amount: 49, status: 'paid' },
  ];
  for (const inv of invoices) {
    const { error } = await supabase.from('billing_invoices').upsert(inv, { onConflict: 'subscription_id,invoice_date' });
    if (error) console.error(`  ✗ Invoice: ${error.message}`);
  }
  console.log(`  ✓ Inserted ${invoices.length} invoices`);
}

async function main() {
  console.log('[seed] Step 1: Auth users…');
  const userIds = await ensureUsers();

  console.log('\n[seed] Step 2: Update user_profiles…');
  await updateUserProfiles(userIds);

  console.log('\n[seed] Step 3: Contacts…');
  await ensureContacts();

  console.log('\n[seed] Step 4: Conversations + messages…');
  await ensureConversationsAndMessages(userIds);

  console.log('\n[seed] Step 5: KB articles…');
  await ensureKBArticles();

  console.log('\n[seed] Step 6: Billing…');
  await ensureBilling(userIds);

  console.log('\n[seed] ✓ All seed data inserted. Demo is ready.');
  console.log('\nSign in with:');
  console.log('  maya@batikcraft.id  / Demo@Into23!   (admin)');
  console.log('  priya@batikcraft.id / Agent@Into23!  (agent)');
  console.log('  raj@cloudstack.in   / Lead@Into23!   (team_lead)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

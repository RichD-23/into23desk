/**
 * Fix: insert user_profiles rows for the auth users created by the seed.
 *
 * The on_auth_user_created trigger didn't fire on auth.admin.createUser,
 * so user_profiles is empty. We re-create them by joining auth.users
 * via the management API (which has access to auth schema).
 */
import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!URL || !KEY) {
  console.error('Missing env');
  process.exit(1);
}

const supabase = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } });

interface Profile {
  email: string;
  full_name: string;
  role: 'admin' | 'agent' | 'team_lead';
  initials: string;
  color_class: string;
  languages: string[];
  agent_status: 'online' | 'away' | 'offline';
}

const PROFILES: Profile[] = [
  { email: 'maya@batikcraft.id',  full_name: 'Maya Wijaya',     role: 'admin',     initials: 'MW', color_class: 'bg-purple-100 text-purple-700', languages: ['ID','EN'],         agent_status: 'online' },
  { email: 'priya@batikcraft.id', full_name: 'Priya Nair',      role: 'agent',     initials: 'PN', color_class: 'bg-purple-100 text-purple-700', languages: ['EN','TA','HI'],    agent_status: 'online' },
  { email: 'raj@cloudstack.in',   full_name: 'Raj Sharma',      role: 'team_lead', initials: 'RS', color_class: 'bg-blue-100 text-blue-700',     languages: ['EN','HI'],        agent_status: 'online' },
  { email: 'arif@batikcraft.id',  full_name: 'Arif Wibowo',     role: 'agent',     initials: 'AW', color_class: 'bg-blue-100 text-blue-700',     languages: ['ID','EN'],        agent_status: 'online' },
  { email: 'kavitha@batikcraft.id', full_name: 'Kavitha Rajan', role: 'agent',     initials: 'KR', color_class: 'bg-orange-100 text-orange-700', languages: ['TA','EN','HI'],   agent_status: 'online' },
];

async function main() {
  // First, find the auth.users IDs by listing them.
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error('listUsers failed:', listErr.message);
    process.exit(1);
  }
  console.log(`[fix] Found ${users.length} auth users`);

  for (const p of PROFILES) {
    const authUser = users.find((u: any) => u.email === p.email);
    if (!authUser) {
      console.log(`  ✗ No auth user for ${p.email}`);
      continue;
    }
    const id = authUser.id;
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        id,
        email: p.email,
        full_name: p.full_name,
        role: p.role,
        initials: p.initials,
        color_class: p.color_class,
        languages: p.languages,
        agent_status: p.agent_status,
        is_active: true,
      }, { onConflict: 'id' })
      .select()
      .single();
    if (error) {
      console.log(`  ✗ ${p.email}: ${error.message}`);
    } else {
      console.log(`  ✓ ${p.email} → profile ${data.id}`);
    }
  }

  // Verify
  const { count } = await supabase.from('user_profiles').select('*', { count: 'exact', head: true });
  console.log(`\n[fix] user_profiles now has ${count} rows`);
}

main().catch((e) => { console.error(e); process.exit(1); });

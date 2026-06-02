/**
 * /api/workspaces/[id]/members — workspace member management.
 *
 * POST: invite a new member by email.
 *   Body: { email: string, role?: 'admin' | 'agent' | 'team_lead' }
 *   - If the user already exists, add them as a member directly.
 *   - If the user doesn't exist, send an invite email (TODO).
 *
 * GET: list members of a workspace.
 *   Returns: [{ user_id, email, full_name, role, is_active, invited_at, accepted_at }]
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createAdminClient();
  const workspaceId = params.id;

  // Verify the caller is a member of this workspace
  const { data: { user } } = await supabase.auth.getUser(
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || ''
  );
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: callerMembership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (!callerMembership) {
    return NextResponse.json({ error: 'Not a member of this workspace' }, { status: 403 });
  }

  // Fetch the roster
  const { data, error } = await supabase
    .from('workspace_members')
    .select(`
      user_id, role, invited_at, accepted_at, is_active,
      user_profiles!inner(email, full_name, initials, color_class, agent_status)
    `)
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .order('invited_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'Failed to list members', details: error.message }, { status: 500 });
  }

  const members = (data || []).map((m: any) => ({
    user_id: m.user_id,
    email: m.user_profiles?.email,
    full_name: m.user_profiles?.full_name,
    initials: m.user_profiles?.initials,
    color_class: m.user_profiles?.color_class,
    agent_status: m.user_profiles?.agent_status,
    role: m.role,
    invited_at: m.invited_at,
    accepted_at: m.accepted_at,
    is_active: m.is_active,
  }));

  return NextResponse.json({ members });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createAdminClient();
  const workspaceId = params.id;

  // Verify caller is owner/admin of the workspace
  const { data: { user } } = await supabase.auth.getUser(
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || ''
  );
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: callerMembership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (!callerMembership || !['admin', 'team_lead'].includes(callerMembership.role)) {
    return NextResponse.json({ error: 'Only admins or team leads can invite members' }, { status: 403 });
  }

  let body: any;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const { email, role = 'agent' } = body || {};
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'email is required' }, { status: 400 });
  }
  if (!['admin', 'agent', 'team_lead'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  // Find the user by email (via auth.admin.listUsers)
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    return NextResponse.json({ error: 'Failed to list users', details: listErr.message }, { status: 500 });
  }
  const invitee = users.find((u: any) => u.email === email);
  if (!invitee) {
    return NextResponse.json(
      { error: 'User not found. They need to sign up first.', code: 'user_not_found' },
      { status: 404 }
    );
  }

  // Check seat limit (cap at workspace.plan_id's max seats, or default 3)
  // TODO: query the plan to get the seat limit. For now, hard cap at 20.
  const { count } = await supabase
    .from('workspace_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('is_active', true);

  if ((count || 0) >= 20) {
    return NextResponse.json({ error: 'Seat limit reached. Upgrade your plan to add more members.' }, { status: 402 });
  }

  // Add the member
  const { data, error } = await supabase
    .from('workspace_members')
    .upsert({
      workspace_id: workspaceId,
      user_id: invitee.id,
      role,
      invited_by: user.id,
      accepted_at: new Date().toISOString(),
      is_active: true,
    }, { onConflict: 'workspace_id,user_id' })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to invite member', details: error.message }, { status: 500 });
  }

  return NextResponse.json({ membership: data });
}

/**
 * POST /api/workspaces — create a new workspace.
 * The authenticated user becomes the owner and is auto-added as a member.
 *
 * Body: { name: string, slug?: string }
 *
 * Use case: a new user signs up, this is the first API call. Creates their
 * org, sets them as owner, redirects to the onboarding wizard.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  // Identify the caller from their access token
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
  }
  const token = authHeader.replace(/^Bearer\s+/i, '');

  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  let body: any;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const { name, slug } = body || {};
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  // Generate a slug if not provided
  const finalSlug = (slug && typeof slug === 'string')
    ? slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) + '-' + Math.random().toString(36).slice(2, 6);

  // Create the workspace
  const { data: workspace, error: wsErr } = await supabase
    .from('workspaces')
    .insert({
      name: name.trim(),
      slug: finalSlug,
      owner_id: user.id,
      plan_id: 'starter',
      trial_ends_at: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000).toISOString(),
      is_active: true,
    })
    .select()
    .single();

  if (wsErr || !workspace) {
    return NextResponse.json(
      { error: 'Failed to create workspace', details: wsErr?.message },
      { status: 500 }
    );
  }

  // Add the owner as a member with admin role
  const { error: memberErr } = await supabase
    .from('workspace_members')
    .insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: 'admin',
      invited_by: user.id,
      accepted_at: new Date().toISOString(),
      is_active: true,
    });

  if (memberErr) {
    // Roll back workspace creation
    await supabase.from('workspaces').delete().eq('id', workspace.id);
    return NextResponse.json(
      { error: 'Failed to add owner as member', details: memberErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ workspace, role: 'admin' });
}

/**
 * GET /api/workspaces — list workspaces the current user belongs to.
 */
export async function GET(request: NextRequest) {
  const supabase = createAdminClient();

  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
  }
  const token = authHeader.replace(/^Bearer\s+/i, '');

  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('workspaces')
    .select(`
      id, name, slug, plan_id, trial_ends_at, is_active, settings, created_at,
      workspace_members!inner(role, is_active)
    `)
    .eq('workspace_members.user_id', user.id)
    .eq('workspace_members.is_active', true)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'Failed to list workspaces', details: error.message }, { status: 500 });
  }

  // Flatten the role from the join
  const workspaces = (data || []).map((w: any) => ({
    ...w,
    role: w.workspace_members?.[0]?.role || 'agent',
  }));

  return NextResponse.json({ workspaces });
}

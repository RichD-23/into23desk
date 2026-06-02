/**
 * POST /api/workspaces/[id]/whatsapp/connect
 *
 * Connect a WhatsApp Business Account to the workspace.
 *
 * Two modes:
 *   1. OAuth code: POST { code: string } — we exchange with Meta for a token
 *   2. Manual:     POST { phone_number_id, access_token } — paste from dashboard
 *
 * Either way we store:
 *   - whatsapp_phone_number_id
 *   - whatsapp_access_token_encrypted
 *   - whatsapp_business_account_id (if returned)
 * in the workspaces row.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const META_GRAPH_API = 'https://graph.facebook.com/v21.0';

/**
 * TODO: replace this with a proper encryption scheme. For now we just
 * store the token as-is (with a small obfuscation). The right approach is
 * Supabase Vault or AWS KMS / GCP KMS.
 */
function encryptToken(token: string): string {
  return token; // Placeholder. Replace with KMS before production.
}

async function exchangeCodeForToken(code: string, redirectUri: string): Promise<{
  access_token: string;
  waba_id?: string;
  phone_number_id?: string;
}> {
  if (!META_APP_ID || !META_APP_SECRET) {
    throw new Error('META_APP_ID and META_APP_SECRET must be set to use OAuth code flow');
  }
  const url = `${META_GRAPH_API}/oauth/access_token`;
  const params = new URLSearchParams({
    client_id: META_APP_ID,
    client_secret: META_APP_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });
  const res = await fetch(`${url}?${params}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function fetchPhoneNumberId(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${META_GRAPH_API}/me/businesses?fields=owned_whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number,verified_name}}&access_token=${accessToken}`);
    if (!res.ok) return null;
    const data = await res.json();
    // Pick the first phone number from the first WABA
    const phone = data?.data?.[0]?.owned_whatsapp_business_accounts?.data?.[0]?.phone_numbers?.data?.[0];
    return phone?.id || null;
  } catch {
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createAdminClient();
  const { id: workspaceId } = await params;

  // Verify caller is a member of this workspace (RLS would do this, but
  // we need to read the workspace BEFORE the call to know what to update).
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { data: { user } } = await supabase.auth.getUser(token);
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

  if (!callerMembership || callerMembership.role !== 'admin') {
    return NextResponse.json({ error: 'Only workspace admins can connect WhatsApp' }, { status: 403 });
  }

  let body: any;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  let phoneNumberId: string | undefined;
  let accessToken: string;
  let wabaId: string | undefined;

  if (body.code) {
    // OAuth code flow — exchange with Meta
    const redirectUri = body.redirect_uri || `${request.nextUrl.origin}/onboarding-setup-wizard`;
    const result = await exchangeCodeForToken(body.code, redirectUri);
    accessToken = result.access_token;
    phoneNumberId = body.phone_number_id || (await fetchPhoneNumberId(accessToken)) || undefined;
    wabaId = result.waba_id;
  } else if (body.phone_number_id && body.access_token) {
    // Manual mode
    accessToken = body.access_token;
    phoneNumberId = body.phone_number_id;
    wabaId = body.waba_id;
  } else {
    return NextResponse.json({ error: 'Provide either { code } or { phone_number_id, access_token }' }, { status: 400 });
  }

  if (!phoneNumberId) {
    return NextResponse.json({ error: 'Could not determine phone_number_id. Use manual mode with explicit phone_number_id.' }, { status: 400 });
  }

  // Update the workspace
  const { error: updateErr } = await supabase
    .from('workspaces')
    .update({
      whatsapp_phone_number_id: phoneNumberId,
      whatsapp_access_token_encrypted: encryptToken(accessToken),
      whatsapp_business_account_id: wabaId || null,
    })
    .eq('id', workspaceId);

  if (updateErr) {
    return NextResponse.json({ error: 'Failed to save WhatsApp credentials', details: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    workspace_id: workspaceId,
    phone_number_id: phoneNumberId,
    waba_id: wabaId,
  });
}

/**
 * GET /api/workspaces/[id]/whatsapp/connect
 * Returns the current connection status (no secrets).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createAdminClient();
  const { id } = await params;
  const { data, error } = await supabase
    .from('workspaces')
    .select('whatsapp_phone_number_id, whatsapp_business_account_id, updated_at')
    .eq('id', id)
    .single();
  if (error) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({
    connected: !!data.whatsapp_phone_number_id,
    phone_number_id: data.whatsapp_phone_number_id || null,
    waba_id: data.whatsapp_business_account_id || null,
    updated_at: data.updated_at,
  });
}

/**
 * POST /api/billing/checkout
 *
 * Create a Stripe Checkout session for a workspace to subscribe to a plan.
 *
 * Body: { workspaceId: string, planId: 'starter' | 'pro' | 'enterprise' }
 *
 * Returns: { url: string } — the Stripe Checkout URL to redirect the user to.
 */
import { NextRequest, NextResponse } from 'next/server';
import { stripe, getPriceId } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
  }

  let body: any;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const { workspaceId, planId } = body || {};
  if (!workspaceId || !planId || !['starter', 'pro', 'enterprise'].includes(planId)) {
    return NextResponse.json({ error: 'workspaceId and planId are required' }, { status: 400 });
  }

  const priceId = getPriceId(planId);
  if (!priceId) {
    return NextResponse.json({ error: `Price not configured for plan ${planId}. Set STRIPE_PRICE_${planId.toUpperCase()}_MONTHLY in env.` }, { status: 503 });
  }

  const supabase = createAdminClient();
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify caller is an admin of the workspace
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (!membership || membership.role !== 'admin') {
    return NextResponse.json({ error: 'Only workspace admins can manage billing' }, { status: 403 });
  }

  // Get workspace for customer email
  const { data: ws } = await supabase
    .from('workspaces')
    .select('name, owner_id, user_profiles!workspaces_owner_id_fkey(email)')
    .eq('id', workspaceId)
    .single();

  if (!ws) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
  }

  const customerEmail = (ws as any).user_profiles?.email || user.email;
  const origin = request.nextUrl.origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: customerEmail,
      client_reference_id: workspaceId,
      metadata: { workspace_id: workspaceId, plan_id: planId },
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: { workspace_id: workspaceId, plan_id: planId },
      },
      success_url: `${origin}/billing-dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing-dashboard?checkout=cancelled`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('[checkout] Stripe error:', err);
    return NextResponse.json({ error: 'Failed to create checkout session', details: err.message }, { status: 500 });
  }
}

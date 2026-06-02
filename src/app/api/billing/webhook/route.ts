/**
 * POST /api/billing/webhook
 *
 * Stripe webhook receiver. Handles subscription lifecycle events.
 *
 * Events we care about:
 *   - customer.subscription.created → upgrade (or new)
 *   - customer.subscription.updated → plan change or status change
 *   - customer.subscription.deleted → downgrade to free
 *   - invoice.payment_succeeded → subscription is healthy
 *   - invoice.payment_failed → past due, give 7-day grace
 *
 * Sets:
 *   workspaces.plan_id        = the new plan
 *   workspaces.trial_ends_at  = from subscription.trial_end
 *   workspaces.is_active      = false if deleted or past_due beyond grace
 *
 * NO auth — verified by Stripe webhook signature.
 */
import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_WEBHOOK_SECRET, planFromPriceId } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const rawBody = await request.text();
  const sig = request.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig || '', STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('[stripe-webhook] signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as any;
        const workspaceId = sub.metadata?.workspace_id;
        const planId = planFromPriceId(sub.items?.data?.[0]?.price?.id) || sub.metadata?.plan_id || 'starter';
        const status = sub.status; // 'active', 'trialing', 'past_due', 'canceled', 'incomplete', 'unpaid'
        const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;
        const isActive = ['active', 'trialing'].includes(status);

        if (workspaceId) {
          await supabase
            .from('workspaces')
            .update({
              plan_id: planId,
              trial_ends_at: trialEnd,
              is_active: isActive,
            })
            .eq('id', workspaceId);
          console.log(`[stripe-webhook] ${event.type}: workspace ${workspaceId} → ${planId} (${status})`);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as any;
        const workspaceId = sub.metadata?.workspace_id;
        if (workspaceId) {
          await supabase
            .from('workspaces')
            .update({ plan_id: 'starter', is_active: false })
            .eq('id', workspaceId);
          console.log(`[stripe-webhook] subscription deleted: workspace ${workspaceId} → starter (deactivated)`);
        }
        break;
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object as any;
        const customerId = inv.customer;
        // Find the workspace via the customer ID (we'd need to track this)
        // For now, just log
        console.warn(`[stripe-webhook] payment failed for customer ${customerId}`);
        // TODO: mark workspace as past_due after 7 days
        break;
      }
      default:
        // Ignore other events
        break;
    }
  } catch (err: any) {
    console.error(`[stripe-webhook] error handling ${event.type}:`, err);
    return NextResponse.json({ error: 'Handler error', details: err.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

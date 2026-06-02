/**
 * Stripe integration — singleton + plan definitions.
 *
 * The Stripe API key + price IDs come from env. In test mode (Stripe test
 * keys), the integration is fully functional without real money. The
 * customer is on the $39/mo Starter plan unless they upgrade.
 *
 * Plan enforcement lives in src/lib/plan-limits.ts (separate file because
 * it's used by API routes that need to check before allowing actions).
 */
import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.warn('[stripe] STRIPE_SECRET_KEY not set. Stripe features will be disabled.');
}

export const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' as any })
  : null;

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// ── Plan definitions ──────────────────────────────────────────────────────

export type PlanId = 'starter' | 'pro' | 'enterprise';

export interface PlanDef {
  id: PlanId;
  name: string;
  priceMonthly: number;
  conversationLimit: number; // per month, 0 = unlimited
  agentLimit: number;        // 0 = unlimited
  features: string[];
}

// The env vars should hold the Stripe Price IDs. The plan definitions
// (price, limits) are mirrored here so we can enforce without an API call.
export const PLANS: Record<PlanId, PlanDef & { priceIdEnvKey: string }> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    priceMonthly: 39,
    conversationLimit: 500,
    agentLimit: 1,
    features: ['WhatsApp-native inbox', 'AI translation (5 languages)', 'KB-grounded AI suggestions', '1 agent seat'],
    priceIdEnvKey: 'STRIPE_PRICE_STARTER_MONTHLY',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 149,
    conversationLimit: 5000,
    agentLimit: 5,
    features: ['Everything in Starter', 'AI deflection analytics', 'Custom workflows', '5 agent seats', 'Priority email support'],
    priceIdEnvKey: 'STRIPE_PRICE_PRO_MONTHLY',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Scale',
    priceMonthly: 349,
    conversationLimit: 0, // unlimited
    agentLimit: 20,
    features: ['Everything in Pro', 'Unlimited conversations', '20 agent seats', 'Dedicated onboarding', 'Phone support', 'Custom integrations'],
    priceIdEnvKey: 'STRIPE_PRICE_ENTERPRISE_MONTHLY',
  },
};

export function getPriceId(planId: PlanId): string | null {
  return process.env[PLANS[planId].priceIdEnvKey] || null;
}

export function planFromPriceId(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  for (const planId of Object.keys(PLANS) as PlanId[]) {
    if (process.env[PLANS[planId].priceIdEnvKey] === priceId) return planId;
  }
  return null;
}

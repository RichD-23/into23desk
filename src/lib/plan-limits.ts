/**
 * Plan enforcement — the gate that decides whether an action is allowed.
 *
 * Used by API routes to:
 *   - Check if a workspace is over its conversation limit (block inbound)
 *   - Check if a workspace is over its seat limit (block invites)
 *   - Decide whether to gate features behind plan upgrades
 */
import { createAdminClient } from '@/lib/supabase/admin';
import { PLANS, type PlanId } from '@/lib/stripe';

export interface PlanStatus {
  plan: PlanId;
  isActive: boolean;
  trialEndsAt: string | null;
  isInTrial: boolean;
  conversationLimit: number;
  agentLimit: number;
  conversationCount: number;     // current month
  agentCount: number;           // active members
  conversationOver: boolean;
  agentOver: boolean;
}

export async function getPlanStatus(workspaceId: string): Promise<PlanStatus | null> {
  const supabase = createAdminClient();
  const { data: ws, error } = await supabase
    .from('workspaces')
    .select('plan_id, is_active, trial_ends_at')
    .eq('id', workspaceId)
    .single();
  if (error || !ws) return null;

  const plan = (ws.plan_id || 'starter') as PlanId;
  const planDef = PLANS[plan] || PLANS.starter;

  // Count conversations this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count: convCount } = await supabase
    .from('conversations')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .gte('created_at', startOfMonth.toISOString());

  // Count active members
  const { count: memberCount } = await supabase
    .from('workspace_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('is_active', true);

  const trialEndsAt = ws.trial_ends_at;
  const isInTrial = trialEndsAt ? new Date(trialEndsAt) > new Date() : false;

  return {
    plan,
    isActive: ws.is_active ?? true,
    trialEndsAt,
    isInTrial,
    conversationLimit: planDef.conversationLimit,
    agentLimit: planDef.agentLimit,
    conversationCount: convCount || 0,
    agentCount: memberCount || 0,
    conversationOver: planDef.conversationLimit > 0 && (convCount || 0) >= planDef.conversationLimit,
    agentOver: planDef.agentLimit > 0 && (memberCount || 0) > planDef.agentLimit,
  };
}

export function requirePlanFeature(plan: PlanId, feature: 'kb_suggestions' | 'deflection_analytics' | 'unlimited_conversations'): boolean {
  // For now, all plans have the same features. The 3-tier model is enforced
  // by conversation/agent limits, not feature gates. As we add premium
  // features, they'll be gated here.
  return true;
}

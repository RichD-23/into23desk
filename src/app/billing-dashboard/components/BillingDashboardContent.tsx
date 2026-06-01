'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, Users, TrendingUp, Calendar, Download, CheckCircle2,
  AlertCircle, ChevronRight, ArrowUpCircle, ArrowDownCircle, Zap,
  Shield, Star, RefreshCw, X,
} from 'lucide-react';
import { plans, type PlanId } from './billingData';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// ── helpers ──────────────────────────────────────────────────────────────────

const statusStyles: Record<string, string> = {
  paid: 'bg-success/10 text-success',
  pending: 'bg-warning/10 text-warning',
  failed: 'bg-danger/10 text-danger',
};

const planIcons: Record<PlanId, React.ReactNode> = {
  starter: <Zap size={16} />,
  pro: <Star size={16} />,
  enterprise: <Shield size={16} />,
};

const planAccent: Record<PlanId, string> = {
  starter: 'border-primary/30 bg-primary/5',
  pro: 'border-ai/40 bg-ai/5',
  enterprise: 'border-warning/30 bg-warning/5',
};

const planIconBg: Record<PlanId, string> = {
  starter: 'bg-primary/10 text-primary',
  pro: 'bg-ai/10 text-ai',
  enterprise: 'bg-warning/10 text-warning',
};

interface ConfirmModalProps {
  action: 'upgrade' | 'downgrade';
  targetPlan: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({ action, targetPlan, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${action === 'upgrade' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
              {action === 'upgrade' ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}
            </div>
            <div>
              <h3 className="font-700 text-foreground text-[15px]">
                {action === 'upgrade' ? 'Upgrade' : 'Downgrade'} Plan
              </h3>
              <p className="text-xs text-muted-foreground">This is a mock action — no charge will occur</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-foreground mb-6">
          You&apos;re about to {action} to the <span className="font-600">{targetPlan}</span> plan.
          {action === 'downgrade' && (
            <span className="block mt-2 text-warning text-xs">
              ⚠️ Some features may become unavailable after downgrading.
            </span>
          )}
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-500 text-foreground hover:bg-secondary transition-colors">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-600 text-white transition-colors ${action === 'upgrade' ? 'bg-success hover:bg-success/90' : 'bg-warning hover:bg-warning/90'}`}
          >
            Confirm {action === 'upgrade' ? 'Upgrade' : 'Downgrade'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface SubscriptionData {
  id: string;
  planId: PlanId;
  billingCycle: 'monthly' | 'annual';
  seatsUsed: number;
  seatsTotal: number;
  nextBillingDate: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  monthlySpend: number;
}

interface InvoiceData {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  invoiceUrl: string;
}

export default function BillingDashboardContent() {
  const { user } = useAuth();
  const supabase = createClient();

  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePlan, setActivePlan] = useState<PlanId>('pro');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [pendingPlan, setPendingPlan] = useState<{ id: PlanId; action: 'upgrade' | 'downgrade' } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchBillingData = useCallback(async () => {
    if (!user) return;
    try {
      const { data: subData, error: subError } = await supabase
        .from('billing_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!subError && subData) {
        setSubscription({
          id: subData.id,
          planId: subData.plan_id as PlanId,
          billingCycle: subData.billing_cycle as 'monthly' | 'annual',
          seatsUsed: subData.seats_used,
          seatsTotal: subData.seats_total,
          nextBillingDate: subData.next_billing_date
            ? new Date(subData.next_billing_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '',
          currentPeriodStart: subData.current_period_start || '',
          currentPeriodEnd: subData.current_period_end || '',
          monthlySpend: subData.monthly_spend,
        });
        setActivePlan(subData.plan_id as PlanId);
        setBillingCycle(subData.billing_cycle as 'monthly' | 'annual');
      }

      const { data: invData, error: invError } = await supabase
        .from('billing_invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('invoice_date', { ascending: false });

      if (!invError && invData) {
        setInvoices(invData.map((inv: any) => ({
          id: inv.id,
          date: new Date(inv.invoice_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          description: inv.description,
          amount: inv.amount,
          status: inv.status as 'paid' | 'pending' | 'failed',
          invoiceUrl: inv.invoice_url || '#',
        })));
      }
    } catch (err: any) {
      console.log('Billing fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  const currentPlan = plans.find((p) => p.id === activePlan)!;
  const planOrder: PlanId[] = ['starter', 'pro', 'enterprise'];

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handlePlanAction = (targetId: PlanId) => {
    const currentIdx = planOrder.indexOf(activePlan);
    const targetIdx = planOrder.indexOf(targetId);
    const action = targetIdx > currentIdx ? 'upgrade' : 'downgrade';
    setPendingPlan({ id: targetId, action });
  };

  const confirmPlanChange = async () => {
    if (!pendingPlan || !subscription) return;
    const targetPlan = plans.find((p) => p.id === pendingPlan.id)!;
    const newMonthly = billingCycle === 'annual' ? targetPlan.annualPrice : targetPlan.monthlyPrice;

    const { error } = await supabase
      .from('billing_subscriptions')
      .update({
        plan_id: pendingPlan.id,
        seats_total: targetPlan.seats,
        monthly_spend: newMonthly,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id);

    if (!error) {
      setActivePlan(pendingPlan.id);
      showToast(`Successfully ${pendingPlan.action === 'upgrade' ? 'upgraded' : 'downgraded'} to ${targetPlan.name} plan`);
      fetchBillingData();
    }
    setPendingPlan(null);
  };

  const sub = subscription || {
    seatsUsed: 0,
    seatsTotal: currentPlan?.seats || 3,
    nextBillingDate: '',
    monthlySpend: currentPlan?.monthlyPrice || 49,
  };

  const monthlySpend = billingCycle === 'annual' ? currentPlan.annualPrice : currentPlan.monthlyPrice;
  const annualSavings = (currentPlan.monthlyPrice - currentPlan.annualPrice) * 12;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading billing data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card flex-shrink-0">
        <div>
          <h1 className="text-[17px] font-700 text-foreground">Billing &amp; Subscription</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage your plan, seats, and payment history</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-600 ${planIconBg[activePlan]}`}>
            {planIcons[activePlan]}
            {currentPlan.name} Plan
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* KPI Row */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-500">Monthly Spend</span>
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <CreditCard size={14} />
              </div>
            </div>
            <p className="text-2xl font-700 text-foreground">${monthlySpend}</p>
            <p className="text-[11px] text-muted-foreground">Next billing: {sub.nextBillingDate || '—'}</p>
          </div>

          <div className="card p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-500">Agent Seats</span>
              <div className="w-7 h-7 rounded-lg bg-ai/10 text-ai flex items-center justify-center">
                <Users size={14} />
              </div>
            </div>
            <p className="text-2xl font-700 text-foreground">
              {sub.seatsUsed}
              <span className="text-base font-500 text-muted-foreground">/{currentPlan.seats}</span>
            </p>
            <div className="w-full bg-secondary rounded-full h-1.5 mt-0.5">
              <div
                className="bg-ai h-1.5 rounded-full transition-all"
                style={{ width: `${(sub.seatsUsed / currentPlan.seats) * 100}%` }}
              />
            </div>
          </div>

          <div className="card p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-500">Billing Cycle</span>
              <div className="w-7 h-7 rounded-lg bg-success/10 text-success flex items-center justify-center">
                <Calendar size={14} />
              </div>
            </div>
            <p className="text-2xl font-700 text-foreground capitalize">{billingCycle}</p>
            {billingCycle === 'monthly' && (
              <p className="text-[11px] text-success">Save ${annualSavings}/yr with annual</p>
            )}
            {billingCycle === 'annual' && (
              <p className="text-[11px] text-muted-foreground">Saving ${annualSavings}/yr</p>
            )}
          </div>

          <div className="card p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-500">Annual Projection</span>
              <div className="w-7 h-7 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
                <TrendingUp size={14} />
              </div>
            </div>
            <p className="text-2xl font-700 text-foreground">${monthlySpend * 12}</p>
            <p className="text-[11px] text-muted-foreground">Based on current plan</p>
          </div>
        </div>

        {/* Plan Selection */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-700 text-foreground">Subscription Plans</h2>
            <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-3 py-1.5 rounded-md text-xs font-600 transition-colors ${billingCycle === 'monthly' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-3 py-1.5 rounded-md text-xs font-600 transition-colors flex items-center gap-1 ${billingCycle === 'annual' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Annual
                <span className="bg-success/15 text-success text-[10px] px-1.5 py-0.5 rounded-full font-700">-20%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {plans.map((plan) => {
              const isCurrent = plan.id === activePlan;
              const currentIdx = planOrder.indexOf(activePlan);
              const planIdx = planOrder.indexOf(plan.id);
              const isUpgrade = planIdx > currentIdx;
              const isDowngrade = planIdx < currentIdx;
              const price = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;

              return (
                <div
                  key={plan.id}
                  className={`card relative flex flex-col p-5 border-2 transition-all ${isCurrent ? planAccent[plan.id] : 'border-border hover:border-border/80'} ${plan.highlight && !isCurrent ? 'ring-1 ring-ai/20' : ''}`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-ai text-white text-[10px] font-700 px-3 py-0.5 rounded-full">
                      Most Popular
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-success/10 text-success text-[10px] font-700 px-2 py-0.5 rounded-full">
                      <CheckCircle2 size={10} /> Current
                    </div>
                  )}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${planIconBg[plan.id]}`}>
                    {planIcons[plan.id]}
                  </div>
                  <h3 className="font-700 text-foreground text-[15px]">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-1 mb-3">
                    <span className="text-2xl font-700 text-foreground">${price}</span>
                    <span className="text-xs text-muted-foreground">/mo</span>
                    {billingCycle === 'annual' && (
                      <span className="text-[10px] text-muted-foreground line-through ml-1">${plan.monthlyPrice}</span>
                    )}
                  </div>
                  <ul className="space-y-1.5 flex-1 mb-4">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 size={12} className="text-success flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <button disabled className="w-full py-2 rounded-lg text-xs font-600 bg-secondary text-muted-foreground cursor-not-allowed">
                      Current Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePlanAction(plan.id)}
                      className={`w-full py-2 rounded-lg text-xs font-600 flex items-center justify-center gap-1.5 transition-colors ${isUpgrade ? 'bg-success text-white hover:bg-success/90' : 'border border-border text-foreground hover:bg-secondary'}`}
                    >
                      {isUpgrade ? (
                        <><ArrowUpCircle size={13} /> Upgrade</>
                      ) : (
                        <><ArrowDownCircle size={13} /> Downgrade</>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Seat Management + Payment Method */}
        <div className="grid grid-cols-2 gap-4">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-700 text-foreground">Seat Management</h2>
              <span className="text-xs text-muted-foreground">{currentPlan.seats} seats included</span>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">Used</span>
                  <span className="text-xs font-600 text-foreground">{sub.seatsUsed}/{currentPlan.seats}</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${sub.seatsUsed / currentPlan.seats > 0.8 ? 'bg-warning' : 'bg-ai'}`}
                    style={{ width: `${(sub.seatsUsed / currentPlan.seats) * 100}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  {currentPlan.seats - sub.seatsUsed} seats available
                </p>
              </div>
            </div>
            {sub.seatsUsed / currentPlan.seats > 0.8 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                <AlertCircle size={14} className="text-warning flex-shrink-0 mt-0.5" />
                <p className="text-xs text-warning">
                  You&apos;re using {Math.round((sub.seatsUsed / currentPlan.seats) * 100)}% of your seats. Consider upgrading.
                </p>
              </div>
            )}
            <div className="mt-4 flex items-center gap-2">
              <button className="flex-1 py-2 rounded-lg border border-border text-xs font-600 text-foreground hover:bg-secondary transition-colors flex items-center justify-center gap-1.5">
                <Users size={13} /> Manage Agents
              </button>
              <button className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-600 hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5">
                <ChevronRight size={13} /> Add Seats
              </button>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-700 text-foreground">Payment Method</h2>
              <button className="text-xs text-primary font-600 hover:underline">Update</button>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary border border-border mb-4">
              <div className="w-10 h-7 rounded bg-card border border-border flex items-center justify-center">
                <CreditCard size={16} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-600 text-foreground">•••• •••• •••• 4242</p>
                <p className="text-[11px] text-muted-foreground">Expires 08/27</p>
              </div>
              <div className="ml-auto">
                <span className="text-[10px] bg-success/10 text-success font-600 px-2 py-0.5 rounded-full">Active</span>
              </div>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Billing contact</span>
                <span className="text-foreground font-500">raj@swiftdesk.com</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Billing address</span>
                <span className="text-foreground font-500">Hong Kong, HK</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Tax ID</span>
                <span className="text-foreground font-500">Not set</span>
              </div>
            </div>
            <button className="mt-4 w-full py-2 rounded-lg border border-border text-xs font-600 text-foreground hover:bg-secondary transition-colors flex items-center justify-center gap-1.5">
              <RefreshCw size={13} /> Update Billing Info
            </button>
          </div>
        </div>

        {/* Payment History */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-700 text-foreground">Payment History</h2>
            <button className="text-xs text-primary font-600 hover:underline flex items-center gap-1">
              <Download size={12} /> Export All
            </button>
          </div>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No payment history yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-[11px] font-600 text-muted-foreground pb-2 pr-4">Date</th>
                    <th className="text-left text-[11px] font-600 text-muted-foreground pb-2 pr-4">Description</th>
                    <th className="text-left text-[11px] font-600 text-muted-foreground pb-2 pr-4">Amount</th>
                    <th className="text-left text-[11px] font-600 text-muted-foreground pb-2 pr-4">Status</th>
                    <th className="text-right text-[11px] font-600 text-muted-foreground pb-2">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoices.map((record) => (
                    <tr key={record.id} className="hover:bg-secondary/50 transition-colors">
                      <td className="py-3 pr-4 text-xs text-muted-foreground whitespace-nowrap">{record.date}</td>
                      <td className="py-3 pr-4 text-xs text-foreground font-500">{record.description}</td>
                      <td className="py-3 pr-4 text-xs font-600 text-foreground">${record.amount}</td>
                      <td className="py-3 pr-4">
                        <span className={`text-[10px] font-600 px-2 py-0.5 rounded-full capitalize ${statusStyles[record.status]}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button className="text-xs text-primary font-600 hover:underline flex items-center gap-1 ml-auto">
                          <Download size={11} /> PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Confirm Modal */}
      {pendingPlan && (
        <ConfirmModal
          action={pendingPlan.action}
          targetPlan={plans.find((p) => p.id === pendingPlan.id)!.name}
          onConfirm={confirmPlanChange}
          onCancel={() => setPendingPlan(null)}
        />
      )}

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-foreground text-background text-sm font-500 px-4 py-3 rounded-xl shadow-lg">
          <CheckCircle2 size={15} className="text-success" />
          {toastMsg}
        </div>
      )}
    </div>
  );
}

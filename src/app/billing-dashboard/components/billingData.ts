export type PlanId = 'starter' | 'pro' | 'enterprise';

export interface Plan {
  id: PlanId;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  seats: number;
  features: string[];
  highlight?: boolean;
}

export interface PaymentRecord {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  invoiceUrl: string;
}

export const plans: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 49,
    annualPrice: 39,
    seats: 3,
    features: ['3 agent seats', 'Team Inbox', 'Basic Analytics', 'Email support', '1 Knowledge Base'],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 149,
    annualPrice: 119,
    seats: 10,
    features: ['10 agent seats', 'AI Deflection', 'Advanced Analytics', 'Priority support', '5 Knowledge Bases', 'Multilingual AI'],
    highlight: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 399,
    annualPrice: 319,
    seats: 50,
    features: ['50 agent seats', 'Custom AI models', 'Full Analytics Suite', 'Dedicated CSM', 'Unlimited KBs', 'SSO & Audit Logs'],
  },
];

export const currentSubscription = {
  planId: 'pro' as PlanId,
  billingCycle: 'monthly' as 'monthly' | 'annual',
  seatsUsed: 6,
  seatsTotal: 10,
  nextBillingDate: 'Jun 10, 2026',
  currentPeriodStart: 'May 10, 2026',
  currentPeriodEnd: 'Jun 10, 2026',
  monthlySpend: 149,
};

export const paymentHistory: PaymentRecord[] = [
  { id: 'inv-001', date: 'May 10, 2026', description: 'Pro Plan — May 2026', amount: 149, status: 'paid', invoiceUrl: '#' },
  { id: 'inv-002', date: 'Apr 10, 2026', description: 'Pro Plan — Apr 2026', amount: 149, status: 'paid', invoiceUrl: '#' },
  { id: 'inv-003', date: 'Mar 10, 2026', description: 'Pro Plan — Mar 2026', amount: 149, status: 'paid', invoiceUrl: '#' },
  { id: 'inv-004', date: 'Feb 10, 2026', description: 'Pro Plan — Feb 2026', amount: 149, status: 'paid', invoiceUrl: '#' },
  { id: 'inv-005', date: 'Jan 10, 2026', description: 'Starter Plan — Jan 2026 (Upgraded)', amount: 49, status: 'paid', invoiceUrl: '#' },
  { id: 'inv-006', date: 'Dec 10, 2025', description: 'Starter Plan — Dec 2025', amount: 49, status: 'paid', invoiceUrl: '#' },
];

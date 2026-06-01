'use client';

import React, { useState } from 'react';
import { Building2, Users, MessageSquare, CreditCard, Bell, Bot, Plus, Trash2, Edit2, Check, AlertCircle, Shield, Phone, Activity, RefreshCw,  } from 'lucide-react';
import Toggle from '@/components/ui/Toggle';
import Modal from '@/components/ui/Modal';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';

type SettingsSection =
  | 'workspace' |'agents' |'whatsapp' |'billing' |'notifications' |'ai';

interface NavItem {
  id: SettingsSection;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const navItems: NavItem[] = [
  { id: 'workspace', label: 'Workspace', icon: <Building2 size={16} />, description: 'Team name, timezone, branding' },
  { id: 'agents', label: 'Agents', icon: <Users size={16} />, description: 'Manage team members and roles' },
  { id: 'whatsapp', label: 'WhatsApp API', icon: <MessageSquare size={16} />, description: 'Phone number, webhook, API health' },
  { id: 'billing', label: 'Billing', icon: <CreditCard size={16} />, description: 'Plan, invoices, payment methods' },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={16} />, description: 'Alerts, email digests, SLA warnings' },
  { id: 'ai', label: 'AI Settings', icon: <Bot size={16} />, description: 'Deflection sensitivity, language AI' },
];

const agentsData = [
  { id: 'agent-set-001', name: 'Raj Sharma', email: 'raj@cloudstack.in', role: 'Team Lead', status: 'active', languages: ['EN', 'HI'], lastActive: '2 min ago' },
  { id: 'agent-set-002', name: 'Priya Nair', email: 'priya@cloudstack.in', role: 'Agent', status: 'active', languages: ['EN', 'TA', 'HI'], lastActive: '5 min ago' },
  { id: 'agent-set-003', name: 'Arif Wibowo', email: 'arif@cloudstack.in', role: 'Agent', status: 'active', languages: ['ID', 'EN'], lastActive: '12 min ago' },
  { id: 'agent-set-004', name: 'Thanh Nguyen', email: 'thanh@cloudstack.in', role: 'Agent', status: 'away', languages: ['VI', 'EN'], lastActive: '1 hr ago' },
  { id: 'agent-set-005', name: 'Kavitha Rajan', email: 'kavitha@cloudstack.in', role: 'Agent', status: 'active', languages: ['TA', 'EN', 'HI'], lastActive: '8 min ago' },
];

type InviteForm = { email: string; role: string };

export default function AccountSettingsContent() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('workspace');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [deleteAgentId, setDeleteAgentId] = useState<string | null>(null);
  const [workspaceSaving, setWorkspaceSaving] = useState(false);
  const [workspaceSaved, setWorkspaceSaved] = useState(false);

  // AI Settings state
  const [deflectionSensitivity, setDeflectionSensitivity] = useState(72);
  const [autoDeflect, setAutoDeflect] = useState(true);
  const [humanHandoff, setHumanHandoff] = useState(true);
  const [translationEnabled, setTranslationEnabled] = useState(true);
  const [languageToggles, setLanguageToggles] = useState({
    id: true, th: true, vi: true, ta: true, hi: true, bn: false,
  });

  // Notification state
  const [notifUnassigned, setNotifUnassigned] = useState(true);
  const [notifSlaBreached, setNotifSlaBreached] = useState(true);
  const [notifCsatLow, setNotifCsatLow] = useState(true);
  const [notifDailyDigest, setNotifDailyDigest] = useState(false);
  const [notifWeeklyReport, setNotifWeeklyReport] = useState(true);

  const inviteForm = useForm<InviteForm>();

  const handleWorkspaceSave = () => {
    setWorkspaceSaving(true);
    setTimeout(() => {
      setWorkspaceSaving(false);
      setWorkspaceSaved(true);
      toast.success('Workspace settings saved');
      setTimeout(() => setWorkspaceSaved(false), 3000);
    }, 1000);
  };

  const handleInviteAgent = (data: InviteForm) => {
    toast.success(`Invitation sent to ${data.email}`);
    setInviteModalOpen(false);
    inviteForm.reset();
  };

  const handleDeleteAgent = (id: string) => {
    setDeleteAgentId(null);
    toast.success('Agent removed from workspace');
  };

  const roleColors: Record<string, string> = {
    'Team Lead': 'bg-purple-100 text-purple-700',
    'Agent': 'bg-blue-100 text-blue-700',
    'Admin': 'bg-orange-100 text-orange-700',
  };

  const statusDot: Record<string, string> = {
    active: 'bg-success',
    away: 'bg-warning',
    offline: 'bg-muted-foreground',
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Settings Nav */}
      <div className="w-[240px] xl:w-[260px] flex-shrink-0 border-r border-border bg-card overflow-y-auto scrollbar-thin">
        <div className="px-4 py-4 border-b border-border">
          <h2 className="text-[15px] font-700 text-foreground">Settings</h2>
          <p className="text-[12px] text-muted-foreground">CloudStack · Pro Plan</p>
        </div>
        <nav className="p-2">
          {navItems.map((item) => (
            <button
              key={`settings-nav-${item.id}`}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-left transition-colors ${
                activeSection === item.id
                  ? 'bg-primary/10 text-primary' :'hover:bg-secondary text-foreground'
              }`}
            >
              <span className="mt-0.5 flex-shrink-0">{item.icon}</span>
              <div>
                <p className="text-[13px] font-600">{item.label}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">{item.description}</p>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Workspace Settings */}
        {activeSection === 'workspace' && (
          <div className="p-6 max-w-2xl space-y-6">
            <div>
              <h3 className="text-[17px] font-700 text-foreground mb-1">Workspace Settings</h3>
              <p className="text-[13px] text-muted-foreground">Configure your team's workspace identity and preferences</p>
            </div>

            <div className="card space-y-4">
              <h4 className="text-[13px] font-700 text-foreground">General</h4>
              <div>
                <label htmlFor="ws-name" className="block text-[13px] font-600 text-foreground mb-1.5">
                  Workspace Name
                </label>
                <input id="ws-name" type="text" defaultValue="CloudStack Support" className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ws-timezone" className="block text-[13px] font-600 text-foreground mb-1.5">
                    Timezone
                  </label>
                  <select id="ws-timezone" className="input-field">
                    <option>Asia/Kolkata (IST, UTC+5:30)</option>
                    <option>Asia/Jakarta (WIB, UTC+7)</option>
                    <option>Asia/Bangkok (ICT, UTC+7)</option>
                    <option>Asia/Singapore (SGT, UTC+8)</option>
                    <option>Asia/Ho_Chi_Minh (ICT, UTC+7)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="ws-lang" className="block text-[13px] font-600 text-foreground mb-1.5">
                    Default Language
                  </label>
                  <select id="ws-lang" className="input-field">
                    <option>English</option>
                    <option>Bahasa Indonesia</option>
                    <option>Hindi</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="card space-y-4">
              <h4 className="text-[13px] font-700 text-foreground">Business Hours</h4>
              <p className="text-[12px] text-muted-foreground">
                AI deflection runs 24/7. Human agents are expected online during these hours.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ws-open" className="block text-[13px] font-600 text-foreground mb-1.5">Opening Time</label>
                  <input id="ws-open" type="time" defaultValue="09:00" className="input-field" />
                </div>
                <div>
                  <label htmlFor="ws-close" className="block text-[13px] font-600 text-foreground mb-1.5">Closing Time</label>
                  <input id="ws-close" type="time" defaultValue="18:00" className="input-field" />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                  <button
                    key={`day-${day}`}
                    className={`px-3 py-1.5 text-[12px] font-600 rounded-lg border transition-colors ${
                      i < 5
                        ? 'bg-primary/10 text-primary border-primary/20' :'bg-secondary text-muted-foreground border-border'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div className="card space-y-4">
              <h4 className="text-[13px] font-700 text-foreground">SLA Targets</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="sla-frt" className="block text-[13px] font-600 text-foreground mb-1.5">
                    First Response Time
                  </label>
                  <p className="text-[11px] text-muted-foreground mb-1.5">Target in minutes</p>
                  <input id="sla-frt" type="number" defaultValue={5} className="input-field" />
                </div>
                <div>
                  <label htmlFor="sla-res" className="block text-[13px] font-600 text-foreground mb-1.5">
                    Resolution Time
                  </label>
                  <p className="text-[11px] text-muted-foreground mb-1.5">Target in minutes</p>
                  <input id="sla-res" type="number" defaultValue={30} className="input-field" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleWorkspaceSave}
                disabled={workspaceSaving}
                className="btn-primary px-6"
              >
                {workspaceSaving ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : workspaceSaved ? (
                  <span className="flex items-center gap-1.5">
                    <Check size={14} />
                    Saved
                  </span>
                ) : (
                  'Save Changes'
                )}
              </button>
              <button className="btn-secondary px-6">Cancel</button>
            </div>
          </div>
        )}

        {/* Agents Settings */}
        {activeSection === 'agents' && (
          <div className="p-6 max-w-3xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[17px] font-700 text-foreground mb-1">Agents</h3>
                <p className="text-[13px] text-muted-foreground">
                  {agentsData.length}/5 agent seats used · Pro Plan
                </p>
              </div>
              <button
                onClick={() => setInviteModalOpen(true)}
                className="btn-primary flex items-center gap-1.5"
              >
                <Plus size={14} />
                Invite Agent
              </button>
            </div>

            {/* Seat usage bar */}
            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[13px] font-600 text-foreground">Agent Seats</p>
                <span className="text-[13px] font-700 text-foreground tabular-nums">
                  {agentsData.length} / 5
                </span>
              </div>
              <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${(agentsData.length / 5) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Flat pricing — add up to 5 agents with no extra cost on Pro Plan
              </p>
            </div>

            {/* Agents Table */}
            <div className="card overflow-hidden p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    {['Agent', 'Role', 'Languages', 'Status', 'Last Active', 'Actions'].map((h) => (
                      <th
                        key={`agents-th-${h}`}
                        className="px-4 py-3 text-left text-[11px] font-700 uppercase tracking-wide text-muted-foreground whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {agentsData.map((agent, idx) => (
                    <tr
                      key={agent.id}
                      className={`border-b border-border/50 hover:bg-secondary/40 transition-colors ${
                        idx % 2 === 0 ? '' : 'bg-secondary/20'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-[13px] font-600 text-foreground">{agent.name}</p>
                          <p className="text-[11px] text-muted-foreground">{agent.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`status-badge text-[11px] ${roleColors[agent.role] || 'bg-secondary text-secondary-foreground'}`}>
                          {agent.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {agent.languages.map((lang) => (
                            <span
                              key={`agent-lang-${agent.id}-${lang}`}
                              className="status-badge text-[10px] bg-secondary text-secondary-foreground"
                            >
                              {lang}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${statusDot[agent.status] || 'bg-muted-foreground'}`} />
                          <span className="text-[12px] text-muted-foreground capitalize">{agent.status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-muted-foreground">{agent.lastActive}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            className="btn-ghost p-1.5"
                            aria-label={`Edit ${agent.name}`}
                            title={`Edit ${agent.name}`}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => setDeleteAgentId(agent.id)}
                            className="btn-ghost p-1.5 hover:text-danger"
                            aria-label={`Remove ${agent.name}`}
                            title={`Remove ${agent.name} from workspace`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* WhatsApp API */}
        {activeSection === 'whatsapp' && (
          <div className="p-6 max-w-2xl space-y-6">
            <div>
              <h3 className="text-[17px] font-700 text-foreground mb-1">WhatsApp Business API</h3>
              <p className="text-[13px] text-muted-foreground">Connected phone number, webhook, and API health status</p>
            </div>

            {/* API Health */}
            <div className="card bg-success/5 border-success/20">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-success/10 flex items-center justify-center">
                  <Activity size={16} className="text-success" />
                </div>
                <div>
                  <p className="text-[14px] font-700 text-foreground">API Status: Connected</p>
                  <p className="text-[12px] text-muted-foreground">WhatsApp Cloud API · Meta Business Account verified</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  <span className="text-[12px] text-success font-600">Live</span>
                </div>
              </div>
            </div>

            {/* Phone Number */}
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[13px] font-700 text-foreground">Connected Phone Number</h4>
                <span className="status-badge status-resolved text-[10px]">Verified</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                <Phone size={16} className="text-whatsapp flex-shrink-0" />
                <div>
                  <p className="text-[14px] font-700 text-foreground font-mono">+91 98765 00123</p>
                  <p className="text-[11px] text-muted-foreground">CloudStack Support · Display name verified</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-[12px]">
                <div>
                  <p className="text-muted-foreground mb-0.5">Phone Number ID</p>
                  <p className="font-mono text-foreground">108342910483291</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5">Business Account ID</p>
                  <p className="font-mono text-foreground">234891029384710</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5">Messaging Tier</p>
                  <p className="text-foreground font-600">Tier 2 — 10,000 conversations/day</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5">Free Conversations Used</p>
                  <p className="text-foreground font-600">847 / 1,000 this month</p>
                </div>
              </div>
            </div>

            {/* Webhook Config */}
            <div className="card space-y-4">
              <h4 className="text-[13px] font-700 text-foreground">Webhook Configuration</h4>
              <div>
                <label htmlFor="webhook-url" className="block text-[13px] font-600 text-foreground mb-1.5">
                  Webhook URL
                </label>
                <p className="text-[11px] text-muted-foreground mb-1.5">
                  Configure this URL in your Meta Business Manager
                </p>
                <div className="flex gap-2">
                  <input
                    id="webhook-url"
                    type="text"
                    readOnly
                    value="https://api.swiftdesk.com/webhook/wh_cs_9k2m4"
                    className="input-field font-mono text-[12px] bg-secondary"
                  />
                  <button
                    className="btn-secondary px-3 flex-shrink-0"
                    onClick={() => toast.success('Webhook URL copied')}
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="verify-token" className="block text-[13px] font-600 text-foreground mb-1.5">
                  Verify Token
                </label>
                <div className="flex gap-2">
                  <input
                    id="verify-token"
                    type="password"
                    readOnly
                    value="vt_cs_k9x2m4n8p1q3"
                    className="input-field font-mono text-[12px] bg-secondary"
                  />
                  <button className="btn-secondary px-3 flex-shrink-0">
                    <RefreshCw size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Billing */}
        {activeSection === 'billing' && (
          <div className="p-6 max-w-2xl space-y-6">
            <div>
              <h3 className="text-[17px] font-700 text-foreground mb-1">Billing</h3>
              <p className="text-[13px] text-muted-foreground">Plan details, payment method, and invoices</p>
            </div>

            {/* Current Plan */}
            <div className="card gradient-brand text-white">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-[11px] font-700 uppercase tracking-widest text-white/70">Current Plan</span>
                  <h4 className="text-[22px] font-800 mt-0.5">Pro — $249 / month</h4>
                  <p className="text-[13px] text-white/80">Up to 5 agents · All features · Priority support</p>
                </div>
                <Shield size={24} className="text-white/60" />
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-white/20">
                <div>
                  <p className="text-[11px] text-white/60">Next billing date</p>
                  <p className="text-[14px] font-600">10 Jun 2026</p>
                </div>
                <div>
                  <p className="text-[11px] text-white/60">Contract type</p>
                  <p className="text-[14px] font-600">Annual (saves 20%)</p>
                </div>
                <div>
                  <p className="text-[11px] text-white/60">Next invoice</p>
                  <p className="text-[14px] font-600">$249.00</p>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[13px] font-700 text-foreground">Payment Method</h4>
                <button className="btn-ghost text-[12px]">
                  <Plus size={13} className="mr-1" />
                  Add method
                </button>
              </div>
              <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg border border-border">
                <div className="w-10 h-7 rounded bg-primary/10 flex items-center justify-center">
                  <CreditCard size={14} className="text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-600 text-foreground">Visa ending in 4821</p>
                  <p className="text-[11px] text-muted-foreground">Expires 08/2028 · Raj Sharma</p>
                </div>
                <span className="status-badge status-resolved text-[10px]">Primary</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg border border-border">
                <div className="w-10 h-7 rounded bg-orange-100 flex items-center justify-center">
                  <span className="text-[10px] font-800 text-orange-700">UPI</span>
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-600 text-foreground">UPI Autopay — raj@cloudstack@okaxis</p>
                  <p className="text-[11px] text-muted-foreground">Razorpay · ₹20,750/month mandate active</p>
                </div>
                <span className="status-badge bg-secondary text-secondary-foreground text-[10px]">Backup</span>
              </div>
            </div>

            {/* Recent Invoices */}
            <div className="card space-y-3">
              <h4 className="text-[13px] font-700 text-foreground">Recent Invoices</h4>
              {[
                { id: 'inv-2026-05', date: '10 May 2026', amount: '$249.00', status: 'Paid' },
                { id: 'inv-2026-04', date: '10 Apr 2026', amount: '$249.00', status: 'Paid' },
                { id: 'inv-2026-03', date: '10 Mar 2026', amount: '$249.00', status: 'Paid' },
                { id: 'inv-2026-02', date: '10 Feb 2026', amount: '$249.00', status: 'Paid' },
              ].map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                >
                  <div>
                    <p className="text-[13px] font-600 text-foreground font-mono">{inv.id}</p>
                    <p className="text-[11px] text-muted-foreground">{inv.date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] font-700 text-foreground tabular-nums">{inv.amount}</span>
                    <span className="status-badge status-resolved text-[10px]">{inv.status}</span>
                    <button className="btn-ghost text-[12px] py-1 px-2">Download</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notifications */}
        {activeSection === 'notifications' && (
          <div className="p-6 max-w-2xl space-y-6">
            <div>
              <h3 className="text-[17px] font-700 text-foreground mb-1">Notifications</h3>
              <p className="text-[13px] text-muted-foreground">Configure alerts, digest emails, and SLA warnings</p>
            </div>

            <div className="card space-y-5">
              <h4 className="text-[13px] font-700 text-foreground">Real-time Alerts</h4>
              {[
                { label: 'Unassigned conversation waiting', desc: 'Alert when a conversation has been unassigned for more than 5 minutes', state: notifUnassigned, setter: setNotifUnassigned, id: 'notif-unassigned' },
                { label: 'SLA breach warning', desc: 'Alert 2 minutes before an assigned conversation breaches the FRT SLA', state: notifSlaBreached, setter: setNotifSlaBreached, id: 'notif-sla' },
                { label: 'Low CSAT score submitted', desc: 'Alert when a customer submits a CSAT rating of 2 stars or below', state: notifCsatLow, setter: setNotifCsatLow, id: 'notif-csat' },
              ].map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[13px] font-600 text-foreground">{item.label}</p>
                    <p className="text-[12px] text-muted-foreground">{item.desc}</p>
                  </div>
                  <Toggle checked={item.state} onChange={item.setter} />
                </div>
              ))}
            </div>

            <div className="card space-y-5">
              <h4 className="text-[13px] font-700 text-foreground">Email Reports</h4>
              {[
                { label: 'Daily digest', desc: 'Summary of conversations, AI deflection rate, and unresolved items at 6pm', state: notifDailyDigest, setter: setNotifDailyDigest, id: 'notif-daily' },
                { label: 'Weekly performance report', desc: 'Full team analytics every Monday morning — FRT, CSAT, volume by language', state: notifWeeklyReport, setter: setNotifWeeklyReport, id: 'notif-weekly' },
              ].map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[13px] font-600 text-foreground">{item.label}</p>
                    <p className="text-[12px] text-muted-foreground">{item.desc}</p>
                  </div>
                  <Toggle checked={item.state} onChange={item.setter} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Settings */}
        {activeSection === 'ai' && (
          <div className="p-6 max-w-2xl space-y-6">
            <div>
              <h3 className="text-[17px] font-700 text-foreground mb-1">AI Settings</h3>
              <p className="text-[13px] text-muted-foreground">Configure deflection sensitivity, language AI, and human handoff</p>
            </div>

            <div className="card space-y-5">
              <h4 className="text-[13px] font-700 text-foreground">Deflection Engine</h4>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[13px] font-600 text-foreground">Enable AI Auto-deflection</p>
                  <p className="text-[12px] text-muted-foreground">AI handles FAQs, order tracking, and return queries automatically</p>
                </div>
                <Toggle checked={autoDeflect} onChange={setAutoDeflect} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-[13px] font-600 text-foreground">Deflection Confidence Threshold</p>
                    <p className="text-[12px] text-muted-foreground">
                      AI only responds when confidence exceeds this threshold. Lower = more deflections, higher = fewer but more accurate.
                    </p>
                  </div>
                  <span className="text-[18px] font-800 text-ai tabular-nums ml-4">{deflectionSensitivity}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={95}
                  value={deflectionSensitivity}
                  onChange={(e) => setDeflectionSensitivity(Number(e.target.value))}
                  className="w-full accent-ai"
                  aria-label="Deflection confidence threshold"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>50% — More deflections</span>
                  <span>95% — Fewer, more accurate</span>
                </div>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[13px] font-600 text-foreground">Smart Human Handoff</p>
                  <p className="text-[12px] text-muted-foreground">
                    AI escalates to a human agent with full context when confidence falls below threshold
                  </p>
                </div>
                <Toggle checked={humanHandoff} onChange={setHumanHandoff} />
              </div>
            </div>

            <div className="card space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-[13px] font-700 text-foreground">Real-time AI Translation</h4>
                  <p className="text-[12px] text-muted-foreground">
                    Agents read and reply in English while customers communicate in their language
                  </p>
                </div>
                <Toggle checked={translationEnabled} onChange={setTranslationEnabled} />
              </div>

              {translationEnabled && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <p className="text-[12px] font-600 text-muted-foreground uppercase tracking-wide">
                    Enabled Languages
                  </p>
                  {(
                    [
                      { key: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩' },
                      { key: 'th', label: 'Thai', flag: '🇹🇭' },
                      { key: 'vi', label: 'Vietnamese', flag: '🇻🇳' },
                      { key: 'ta', label: 'Tamil', flag: '🇮🇳' },
                      { key: 'hi', label: 'Hindi', flag: '🇮🇳' },
                      { key: 'bn', label: 'Bengali', flag: '🇧🇩' },
                    ] as { key: keyof typeof languageToggles; label: string; flag: string }[]
                  ).map((lang) => (
                    <div
                      key={`ai-lang-${lang.key}`}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{lang.flag}</span>
                        <span className="text-[13px] text-foreground">{lang.label}</span>
                      </div>
                      <Toggle
                        size="sm"
                        checked={languageToggles[lang.key]}
                        onChange={(v) =>
                          setLanguageToggles((prev) => ({ ...prev, [lang.key]: v }))
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => toast.success('AI settings saved')}
              className="btn-primary px-6"
            >
              Save AI Settings
            </button>
          </div>
        )}
      </div>

      {/* Invite Agent Modal */}
      <Modal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Invite Agent"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setInviteModalOpen(false)}>Cancel</button>
            <button
              className="btn-primary"
              onClick={inviteForm.handleSubmit(handleInviteAgent)}
            >
              Send Invitation
            </button>
          </>
        }
      >
        <form className="space-y-4">
          <div>
            <label htmlFor="invite-email" className="block text-[13px] font-600 text-foreground mb-1.5">
              Email Address
            </label>
            <input
              id="invite-email"
              type="email"
              placeholder="agent@yourcompany.com"
              {...inviteForm.register('email', { required: true })}
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="invite-role" className="block text-[13px] font-600 text-foreground mb-1.5">
              Role
            </label>
            <select
              id="invite-role"
              {...inviteForm.register('role')}
              className="input-field"
            >
              <option value="Agent">Support Agent</option>
              <option value="Team Lead">Team Lead</option>
            </select>
          </div>
          <div className="p-3 bg-secondary rounded-lg text-[12px] text-muted-foreground">
            The agent will receive an email with a link to set their password and join your workspace.
          </div>
        </form>
      </Modal>

      {/* Delete Agent Confirm Modal */}
      <Modal
        open={!!deleteAgentId}
        onClose={() => setDeleteAgentId(null)}
        title="Remove Agent"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setDeleteAgentId(null)}>Cancel</button>
            <button
              className="btn-primary bg-danger hover:bg-red-700"
              onClick={() => handleDeleteAgent(deleteAgentId!)}
            >
              Remove Agent
            </button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[14px] text-foreground mb-1">
              This will remove the agent from your workspace. Their conversation history will be preserved.
            </p>
            <p className="text-[13px] text-muted-foreground">This action cannot be undone.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  Users,
  BookOpen,
  Bot,
  Zap,
  Phone,
  QrCode,
  Plus,
  Trash2,
  Send,
  Globe,
  ArrowRight,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

type Step = 1 | 2 | 3 | 4 | 5;

interface StepConfig {
  id: Step;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const steps: StepConfig[] = [
  { id: 1, label: 'Connect WhatsApp', icon: <MessageSquare size={16} />, description: 'Link your WhatsApp Business number' },
  { id: 2, label: 'Workspace Setup', icon: <Globe size={16} />, description: 'Name your team and configure' },
  { id: 3, label: 'Invite Agents', icon: <Users size={16} />, description: 'Add your support team members' },
  { id: 4, label: 'Knowledge Base', icon: <BookOpen size={16} />, description: 'Add your first FAQ article' },
  { id: 5, label: 'Test AI', icon: <Bot size={16} />, description: 'Run a test conversation' },
];

const completionItems = [
  { id: 'check-wa', label: 'WhatsApp number connected', done: true },
  { id: 'check-ws', label: 'Workspace configured', done: true },
  { id: 'check-agents', label: 'Agents invited', done: false },
  { id: 'check-kb', label: 'First KB article added', done: false },
  { id: 'check-ai', label: 'AI test conversation run', done: false },
];

type WorkspaceForm = {
  workspaceName: string;
  timezone: string;
  defaultLanguage: string;
  slackWebhook?: string;
};

type KBArticleForm = {
  title: string;
  category: string;
  content: string;
};

interface AgentInvite {
  id: string;
  email: string;
  role: string;
}

interface TestMessage {
  id: string;
  direction: 'in' | 'out' | 'ai';
  content: string;
  timestamp: string;
}

export default function OnboardingWizardContent() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [agentInvites, setAgentInvites] = useState<AgentInvite[]>([
    { id: 'inv-001', email: '', role: 'Agent' },
  ]);
  const [testInput, setTestInput] = useState('');
  const [testMessages, setTestMessages] = useState<TestMessage[]>([]);
  const [testLoading, setTestLoading] = useState(false);
  const [workspaceSaving, setWorkspaceSaving] = useState(false);
  const [kbSaving, setKbSaving] = useState(false);

  const workspaceForm = useForm<WorkspaceForm>({
    defaultValues: { timezone: 'Asia/Kolkata', defaultLanguage: 'en' },
  });
  const kbForm = useForm<KBArticleForm>({
    defaultValues: { category: 'Order Tracking' },
  });

  const completedSteps = [
    phoneVerified,
    currentStep > 2,
    currentStep > 3 && agentInvites.some((a) => a.email),
    currentStep > 4,
    testMessages.length > 0,
  ];
  const completionPct = Math.round((completedSteps.filter(Boolean).length / 5) * 100);

  const handleSendOtp = () => {
    if (!phoneNumber) return;
    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      setOtpSent(true);
      toast.info('OTP sent to your WhatsApp number');
    }, 1200);
  };

  const handleVerifyOtp = () => {
    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      if (otp === '123456' || otp.length === 6) {
        setPhoneVerified(true);
        toast.success('WhatsApp number verified successfully!');
      } else {
        toast.error('Invalid OTP — enter any 6-digit code for the demo');
      }
    }, 1000);
  };

  const handleWorkspaceSave = (data: WorkspaceForm) => {
    setWorkspaceSaving(true);
    setTimeout(() => {
      setWorkspaceSaving(false);
      toast.success('Workspace configured');
      setCurrentStep(3);
    }, 1000);
  };

  const handleAddAgent = () => {
    setAgentInvites((prev) => [
      ...prev,
      { id: `inv-${Date.now()}`, email: '', role: 'Agent' },
    ]);
  };

  const handleRemoveAgent = (id: string) => {
    setAgentInvites((prev) => prev.filter((a) => a.id !== id));
  };

  const handleUpdateAgent = (id: string, field: keyof AgentInvite, value: string) => {
    setAgentInvites((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );
  };

  const handleSendInvites = () => {
    const valid = agentInvites.filter((a) => a.email);
    if (valid.length === 0) {
      toast.error('Add at least one email address to invite');
      return;
    }
    toast.success(`${valid.length} invitation${valid.length > 1 ? 's' : ''} sent`);
    setCurrentStep(4);
  };

  const handleKBSave = (data: KBArticleForm) => {
    setKbSaving(true);
    setTimeout(() => {
      setKbSaving(false);
      toast.success('Article saved and added to AI index');
      setCurrentStep(5);
    }, 1000);
  };

  const aiResponses: Record<string, string> = {
    default: "I can help with that! Based on our knowledge base, here's what I found:\n\nYour order is currently in transit and expected to arrive within 1–2 business days. You can track it using your order number on the JNE website.\n\nIs there anything else I can help you with?",
    return: "To initiate a return, please take photos of the item and packaging and send them here. Our team reviews return requests within 24 hours and arranges free pickup for approved cases.",
    track: "To track your order, reply with 'track [your order number]' — for example, 'track SH-8821'. I'll fetch the real-time status from our logistics partner.",
    cancel: "Orders can be cancelled before they are shipped. Please provide your order number and I'll check if cancellation is still possible.",
  };

  const handleTestSend = () => {
    if (!testInput.trim()) return;
    const userMsg: TestMessage = {
      id: `test-${Date.now()}`,
      direction: 'in',
      content: testInput,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
    setTestMessages((prev) => [...prev, userMsg]);
    setTestInput('');
    setTestLoading(true);

    const lower = testInput.toLowerCase();
    let response = aiResponses.default;
    if (lower.includes('return') || lower.includes('exchange')) response = aiResponses.return;
    else if (lower.includes('track') || lower.includes('where')) response = aiResponses.track;
    else if (lower.includes('cancel')) response = aiResponses.cancel;

    setTimeout(() => {
      const aiMsg: TestMessage = {
        id: `test-ai-${Date.now()}`,
        direction: 'ai',
        content: response,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      };
      setTestMessages((prev) => [...prev, aiMsg]);
      setTestLoading(false);
    }, 1500);
  };

  const daysRemaining = 17;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <AppLogo size={28} />
          <span className="text-[15px] font-700 text-foreground">SwiftDesk</span>
          <span className="text-muted-foreground text-[14px]">/</span>
          <span className="text-[14px] text-muted-foreground">Setup Wizard</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[12px] text-warning">
            <Clock size={13} />
            <span className="font-600">{daysRemaining} days left in free trial</span>
          </div>
          <Link href="/" className="btn-ghost text-[12px]">
            Skip setup
          </Link>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Steps + Checklist */}
        <div className="w-[280px] xl:w-[300px] flex-shrink-0 border-r border-border bg-card overflow-y-auto scrollbar-thin p-5">
          {/* Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[13px] font-700 text-foreground">Setup Progress</p>
              <span className="text-[13px] font-800 text-primary tabular-nums">{completionPct}%</span>
            </div>
            <div className="w-full h-2 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Complete all steps to reach first value in under 7 days
            </p>
          </div>

          {/* Step List */}
          <div className="space-y-1 mb-6">
            {steps.map((step) => {
              const isActive = currentStep === step.id;
              const isDone = completedSteps[step.id - 1];
              const isReachable = step.id <= currentStep;

              return (
                <button
                  key={`wizard-step-${step.id}`}
                  onClick={() => isReachable && setCurrentStep(step.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : isDone
                      ? 'text-success hover:bg-secondary'
                      : isReachable
                      ? 'text-foreground hover:bg-secondary'
                      : 'text-muted-foreground cursor-not-allowed opacity-50'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[12px] font-700 ${
                      isDone
                        ? 'bg-success text-white'
                        : isActive
                        ? 'bg-primary text-white' :'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {isDone ? <Check size={13} /> : step.id}
                  </div>
                  <div>
                    <p className="text-[13px] font-600">{step.label}</p>
                    <p className="text-[11px] text-muted-foreground">{step.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Completion Checklist */}
          <div className="border-t border-border pt-4">
            <p className="text-[11px] font-700 uppercase tracking-widest text-muted-foreground mb-3">
              Checklist
            </p>
            <div className="space-y-2">
              {completionItems.map((item, i) => (
                <div key={item.id} className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                      completedSteps[i] ? 'bg-success' : 'border-2 border-border'
                    }`}
                  >
                    {completedSteps[i] && <Check size={9} className="text-white" />}
                  </div>
                  <span
                    className={`text-[12px] ${
                      completedSteps[i]
                        ? 'text-muted-foreground line-through'
                        : 'text-foreground'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Step Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-2xl mx-auto px-6 py-8">

            {/* Step 1: Connect WhatsApp */}
            {currentStep === 1 && (
              <div className="space-y-6 fade-in">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-[11px] font-700 flex items-center justify-center">1</span>
                    <h2 className="text-[20px] font-800 text-foreground">Connect WhatsApp Business</h2>
                  </div>
                  <p className="text-[14px] text-muted-foreground">
                    Link your WhatsApp Business number to start receiving conversations in SwiftDesk.
                  </p>
                </div>

                {phoneVerified ? (
                  <div className="card bg-success/5 border-success/20">
                    <div className="flex items-center gap-3">
                      <CheckCircle size={20} className="text-success flex-shrink-0" />
                      <div>
                        <p className="text-[14px] font-700 text-foreground">WhatsApp number verified!</p>
                        <p className="text-[13px] text-muted-foreground">
                          {phoneNumber} is now connected to SwiftDesk.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Method: Phone Number */}
                    <div className="card space-y-4">
                      <h4 className="text-[14px] font-700 text-foreground flex items-center gap-2">
                        <Phone size={15} className="text-primary" />
                        Option 1 — Phone Number Verification
                      </h4>
                      <div>
                        <label htmlFor="wa-phone" className="block text-[13px] font-600 text-foreground mb-1.5">
                          WhatsApp Business Phone Number
                        </label>
                        <p className="text-[11px] text-muted-foreground mb-1.5">
                          Enter the number registered to your WhatsApp Business account
                        </p>
                        <div className="flex gap-2">
                          <input
                            id="wa-phone"
                            type="tel"
                            placeholder="+91 98765 00123"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="input-field font-mono"
                          />
                          <button
                            onClick={handleSendOtp}
                            disabled={!phoneNumber || verifying || otpSent}
                            className="btn-primary px-4 flex-shrink-0"
                          >
                            {verifying ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : otpSent ? (
                              'Sent ✓'
                            ) : (
                              'Send OTP'
                            )}
                          </button>
                        </div>
                      </div>

                      {otpSent && (
                        <div className="fade-in">
                          <label htmlFor="wa-otp" className="block text-[13px] font-600 text-foreground mb-1.5">
                            6-digit OTP
                          </label>
                          <p className="text-[11px] text-muted-foreground mb-1.5">
                            Check your WhatsApp for the verification code. Demo: enter any 6 digits.
                          </p>
                          <div className="flex gap-2">
                            <input
                              id="wa-otp"
                              type="text"
                              placeholder="123456"
                              maxLength={6}
                              value={otp}
                              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                              className="input-field font-mono text-center text-[18px] tracking-widest w-40"
                            />
                            <button
                              onClick={handleVerifyOtp}
                              disabled={otp.length < 6 || verifying}
                              className="btn-primary px-4 flex-shrink-0"
                            >
                              {verifying ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                'Verify'
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Method: QR */}
                    <div className="card">
                      <h4 className="text-[14px] font-700 text-foreground flex items-center gap-2 mb-3">
                        <QrCode size={15} className="text-primary" />
                        Option 2 — Scan QR Code
                      </h4>
                      <div className="flex items-center gap-6">
                        <div className="w-28 h-28 bg-secondary rounded-lg flex items-center justify-center border border-border flex-shrink-0">
                          <QrCode size={56} className="text-muted-foreground" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-[13px] text-foreground">
                            Open WhatsApp Business on your phone, go to{' '}
                            <strong>Settings → Linked Devices → Link a Device</strong>{' '}
                            and scan this QR code.
                          </p>
                          <p className="text-[12px] text-muted-foreground">
                            QR code refreshes every 60 seconds. Only use with WhatsApp Business (not regular WhatsApp).
                          </p>
                          <button
                            onClick={() => {
                              setPhoneVerified(true);
                              toast.success('WhatsApp connected via QR scan');
                            }}
                            className="btn-secondary text-[12px] py-1.5"
                          >
                            Simulate QR Scan (Demo)
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-secondary rounded-lg">
                  <p className="text-[12px] font-600 text-foreground mb-1.5 flex items-center gap-1.5">
                    <AlertCircle size={13} className="text-warning" />
                    Before you connect
                  </p>
                  <ul className="space-y-1">
                    {[
                      'You need a WhatsApp Business account (not a regular WhatsApp account)',
                      'The number must not be linked to another WhatsApp Web session',
                      'You need admin access to your Meta Business Manager',
                      'Free tier: 1,000 conversations/month included',
                    ].map((item, i) => (
                      <li key={`prereq-${i + 1}`} className="text-[12px] text-muted-foreground flex items-start gap-1.5">
                        <span className="mt-1 w-1 h-1 rounded-full bg-muted-foreground flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      if (!phoneVerified) {
                        toast.error('Please verify your WhatsApp number first');
                        return;
                      }
                      setCurrentStep(2);
                    }}
                    className="btn-primary flex items-center gap-2"
                  >
                    Continue <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Workspace Setup */}
            {currentStep === 2 && (
              <div className="space-y-6 fade-in">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-[11px] font-700 flex items-center justify-center">2</span>
                    <h2 className="text-[20px] font-800 text-foreground">Configure Your Workspace</h2>
                  </div>
                  <p className="text-[14px] text-muted-foreground">
                    Set your team name, timezone, and language preferences.
                  </p>
                </div>

                <form onSubmit={workspaceForm.handleSubmit(handleWorkspaceSave)} className="space-y-5">
                  <div className="card space-y-4">
                    <h4 className="text-[13px] font-700 text-foreground">Team Identity</h4>
                    <div>
                      <label htmlFor="ws-name-wizard" className="block text-[13px] font-600 text-foreground mb-1.5">
                        Workspace Name
                      </label>
                      <p className="text-[11px] text-muted-foreground mb-1.5">
                        This appears in notifications and the agent interface
                      </p>
                      <input
                        id="ws-name-wizard"
                        type="text"
                        placeholder="e.g. BatikCraft Support"
                        {...workspaceForm.register('workspaceName', { required: 'Workspace name is required' })}
                        className={`input-field ${workspaceForm.formState.errors.workspaceName ? 'error' : ''}`}
                      />
                      {workspaceForm.formState.errors.workspaceName && (
                        <p className="text-[12px] text-danger mt-1">
                          {workspaceForm.formState.errors.workspaceName.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="ws-tz-wizard" className="block text-[13px] font-600 text-foreground mb-1.5">
                          Timezone
                        </label>
                        <select
                          id="ws-tz-wizard"
                          {...workspaceForm.register('timezone')}
                          className="input-field"
                        >
                          <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                          <option value="Asia/Jakarta">Asia/Jakarta (WIB +7)</option>
                          <option value="Asia/Bangkok">Asia/Bangkok (ICT +7)</option>
                          <option value="Asia/Singapore">Asia/Singapore (SGT +8)</option>
                          <option value="Asia/Ho_Chi_Minh">Asia/Ho Chi Minh (ICT +7)</option>
                          <option value="Asia/Manila">Asia/Manila (PHT +8)</option>
                          <option value="Asia/Kuala_Lumpur">Asia/Kuala Lumpur (MYT +8)</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="ws-deflang-wizard" className="block text-[13px] font-600 text-foreground mb-1.5">
                          Agent Default Language
                        </label>
                        <select
                          id="ws-deflang-wizard"
                          {...workspaceForm.register('defaultLanguage')}
                          className="input-field"
                        >
                          <option value="en">English</option>
                          <option value="id">Bahasa Indonesia</option>
                          <option value="hi">Hindi</option>
                          <option value="th">Thai</option>
                          <option value="vi">Vietnamese</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="card space-y-4">
                    <h4 className="text-[13px] font-700 text-foreground">E-commerce Platform</h4>
                    <p className="text-[12px] text-muted-foreground">
                      Connect your store so agents see order details directly in the inbox
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'shopify', label: 'Shopify', color: 'bg-green-50 border-green-200' },
                        { id: 'shopee', label: 'Shopee', color: 'bg-orange-50 border-orange-200' },
                        { id: 'lazada', label: 'Lazada', color: 'bg-blue-50 border-blue-200' },
                        { id: 'woocommerce', label: 'WooCommerce', color: 'bg-purple-50 border-purple-200' },
                        { id: 'flipkart', label: 'Flipkart', color: 'bg-yellow-50 border-yellow-200' },
                        { id: 'meesho', label: 'Meesho', color: 'bg-pink-50 border-pink-200' },
                      ].map((platform) => (
                        <button
                          key={`platform-${platform.id}`}
                          type="button"
                          className={`p-3 rounded-lg border text-[12px] font-600 text-foreground hover:border-primary transition-colors ${platform.color}`}
                        >
                          {platform.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      You can connect integrations later from Settings → Integrations
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <ChevronLeft size={15} />
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={workspaceSaving}
                      className="btn-primary flex items-center gap-2"
                    >
                      {workspaceSaving ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          Save & Continue <ChevronRight size={15} />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Step 3: Invite Agents */}
            {currentStep === 3 && (
              <div className="space-y-6 fade-in">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-[11px] font-700 flex items-center justify-center">3</span>
                    <h2 className="text-[20px] font-800 text-foreground">Invite Your Support Team</h2>
                  </div>
                  <p className="text-[14px] text-muted-foreground">
                    Add up to 5 agents — all included in your flat-rate plan.
                  </p>
                </div>

                <div className="card space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[13px] font-700 text-foreground">Agent Invitations</h4>
                    <span className="text-[12px] text-muted-foreground">
                      {agentInvites.length} / 4 remaining seats
                    </span>
                  </div>

                  <div className="space-y-3">
                    {agentInvites.map((invite, i) => (
                      <div key={invite.id} className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[11px] font-700 text-muted-foreground flex-shrink-0">
                          {i + 2}
                        </div>
                        <input
                          type="email"
                          placeholder="agent@yourcompany.com"
                          value={invite.email}
                          onChange={(e) => handleUpdateAgent(invite.id, 'email', e.target.value)}
                          className="input-field flex-1"
                          aria-label={`Agent ${i + 2} email`}
                        />
                        <select
                          value={invite.role}
                          onChange={(e) => handleUpdateAgent(invite.id, 'role', e.target.value)}
                          className="input-field w-36 flex-shrink-0"
                          aria-label={`Agent ${i + 2} role`}
                        >
                          <option value="Agent">Agent</option>
                          <option value="Team Lead">Team Lead</option>
                        </select>
                        {agentInvites.length > 1 && (
                          <button
                            onClick={() => handleRemoveAgent(invite.id)}
                            className="btn-ghost p-1.5 hover:text-danger flex-shrink-0"
                            aria-label="Remove this invite"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {agentInvites.length < 4 && (
                    <button
                      onClick={handleAddAgent}
                      className="btn-ghost text-[13px] flex items-center gap-1.5 text-primary"
                    >
                      <Plus size={13} />
                      Add another agent
                    </button>
                  )}

                  <div className="p-3 bg-secondary rounded-lg text-[12px] text-muted-foreground">
                    Agents will receive an email with a link to set their password. They'll be able to start handling conversations immediately after joining.
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <ChevronLeft size={15} />
                    Back
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setCurrentStep(4)}
                      className="btn-ghost text-[13px]"
                    >
                      Skip for now
                    </button>
                    <button
                      onClick={handleSendInvites}
                      className="btn-primary flex items-center gap-2"
                    >
                      Send Invitations <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Knowledge Base */}
            {currentStep === 4 && (
              <div className="space-y-6 fade-in">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-[11px] font-700 flex items-center justify-center">4</span>
                    <h2 className="text-[20px] font-800 text-foreground">Add Your First FAQ Article</h2>
                  </div>
                  <p className="text-[14px] text-muted-foreground">
                    This article will immediately be available to the AI deflection engine. Start with your most common customer question.
                  </p>
                </div>

                <div className="p-3 bg-ai/5 border border-ai/20 rounded-lg flex items-center gap-2">
                  <Bot size={14} className="text-ai flex-shrink-0" />
                  <p className="text-[12px] text-ai font-500">
                    The AI reads your articles and uses them to answer customer questions automatically — no training required.
                  </p>
                </div>

                <form onSubmit={kbForm.handleSubmit(handleKBSave)} className="space-y-4">
                  <div className="card space-y-4">
                    <div>
                      <label htmlFor="kb-title-wizard" className="block text-[13px] font-600 text-foreground mb-1.5">
                        Article Title
                      </label>
                      <p className="text-[11px] text-muted-foreground mb-1.5">
                        Write it as a customer question — e.g. "How do I track my order?"
                      </p>
                      <input
                        id="kb-title-wizard"
                        type="text"
                        placeholder="How do I track my order?"
                        {...kbForm.register('title', { required: 'Title is required' })}
                        className={`input-field ${kbForm.formState.errors.title ? 'error' : ''}`}
                      />
                      {kbForm.formState.errors.title && (
                        <p className="text-[12px] text-danger mt-1">{kbForm.formState.errors.title.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="kb-cat-wizard" className="block text-[13px] font-600 text-foreground mb-1.5">
                        Category
                      </label>
                      <select
                        id="kb-cat-wizard"
                        {...kbForm.register('category')}
                        className="input-field"
                      >
                        {['Order Tracking', 'Returns & Exchanges', 'Payment & Billing', 'Shipping & Delivery', 'Product Information', 'Account & Profile', 'Promotions & Discounts'].map((c) => (
                          <option key={`kb-wizard-cat-${c.replace(/\s+/g, '-')}`} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="kb-content-wizard" className="block text-[13px] font-600 text-foreground mb-1.5">
                        Answer
                      </label>
                      <p className="text-[11px] text-muted-foreground mb-1.5">
                        Write a clear, complete answer. The AI will use this verbatim to respond to customers.
                      </p>
                      <textarea
                        id="kb-content-wizard"
                        placeholder="You can track your order by replying 'track [order number]' in this chat. We'll fetch your real-time delivery status from our logistics partner within seconds."
                        {...kbForm.register('content', { required: 'Answer content is required' })}
                        className={`input-field min-h-[140px] resize-y ${kbForm.formState.errors.content ? 'error' : ''}`}
                      />
                      {kbForm.formState.errors.content && (
                        <p className="text-[12px] text-danger mt-1">{kbForm.formState.errors.content.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="card bg-secondary border-0">
                    <p className="text-[12px] font-600 text-foreground mb-2">
                      💡 Most effective first articles for SEA e-commerce:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        'How to track my order',
                        'Return and exchange policy',
                        'Estimated delivery times',
                        'How to cancel an order',
                      ].map((suggestion) => (
                        <button
                          key={`suggestion-${suggestion.replace(/\s+/g, '-')}`}
                          type="button"
                          onClick={() => kbForm.setValue('title', suggestion)}
                          className="text-left px-3 py-2 bg-card border border-border rounded-lg text-[12px] text-foreground hover:border-primary transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <ChevronLeft size={15} />
                      Back
                    </button>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(5)}
                        className="btn-ghost text-[13px]"
                      >
                        Skip for now
                      </button>
                      <button
                        type="submit"
                        disabled={kbSaving}
                        className="btn-primary flex items-center gap-2"
                      >
                        {kbSaving ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            Save Article <ChevronRight size={15} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* Step 5: Test AI */}
            {currentStep === 5 && (
              <div className="space-y-6 fade-in">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-[11px] font-700 flex items-center justify-center">5</span>
                    <h2 className="text-[20px] font-800 text-foreground">Test Your AI Deflection</h2>
                  </div>
                  <p className="text-[14px] text-muted-foreground">
                    Send a test message below to see how the AI responds using your knowledge base.
                  </p>
                </div>

                <div className="p-3 bg-ai/5 border border-ai/20 rounded-lg flex items-center gap-2">
                  <Zap size={14} className="text-ai flex-shrink-0" />
                  <p className="text-[12px] text-ai font-500">
                    This simulates a real customer conversation. Try: "Where is my order?", "I want to return my item", or "How do I cancel?"
                  </p>
                </div>

                {/* Simulated Chat */}
                <div className="card p-0 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-whatsapp/5">
                    <div className="w-7 h-7 rounded-full bg-whatsapp/20 flex items-center justify-center">
                      <MessageSquare size={13} className="text-whatsapp" />
                    </div>
                    <div>
                      <p className="text-[13px] font-700 text-foreground">Test Customer</p>
                      <p className="text-[11px] text-muted-foreground">+62 812-0000-0000 · Simulated WhatsApp</p>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-whatsapp" />
                      <span className="text-[11px] text-muted-foreground">AI Active</span>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="min-h-[200px] max-h-[280px] overflow-y-auto p-4 space-y-3 bg-secondary/30 scrollbar-thin">
                    {testMessages.length === 0 ? (
                      <div className="flex items-center justify-center h-24 text-center">
                        <div>
                          <Bot size={24} className="text-muted-foreground mx-auto mb-2" />
                          <p className="text-[12px] text-muted-foreground">
                            Send a message below to test the AI
                          </p>
                        </div>
                      </div>
                    ) : (
                      testMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.direction === 'in' ? 'justify-start' : 'justify-end'}`}
                        >
                          <div className="max-w-[80%]">
                            {msg.direction === 'ai' && (
                              <div className="flex items-center gap-1.5 mb-1">
                                <Bot size={11} className="text-ai" />
                                <span className="text-[10px] text-ai font-600">AI Deflection Engine</span>
                              </div>
                            )}
                            <div
                              className={`px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap ${
                                msg.direction === 'in' ?'conversation-bubble-in bg-card text-foreground border border-border' :'conversation-bubble-out bg-ai/10 text-foreground border border-ai/20'
                              }`}
                            >
                              {msg.content}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5 px-1 font-mono">
                              {msg.timestamp}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                    {testLoading && (
                      <div className="flex justify-end">
                        <div className="conversation-bubble-out bg-ai/10 border border-ai/20 px-3 py-2">
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-ai animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-ai animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-ai animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input */}
                  <div className="flex items-center gap-2 p-3 border-t border-border bg-card">
                    <input
                      type="text"
                      placeholder="Type a test customer message..."
                      value={testInput}
                      onChange={(e) => setTestInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleTestSend()}
                      className="input-field flex-1 py-2"
                    />
                    <button
                      onClick={handleTestSend}
                      disabled={!testInput.trim() || testLoading}
                      className="btn-primary p-2 flex-shrink-0"
                      aria-label="Send test message"
                    >
                      <Send size={15} />
                    </button>
                  </div>
                </div>

                {testMessages.length > 0 && (
                  <div className="card bg-success/5 border-success/20 fade-in">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-success flex-shrink-0" />
                      <p className="text-[13px] font-600 text-foreground">
                        AI deflection is working! Your setup is complete.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setCurrentStep(4)}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <ChevronLeft size={15} />
                    Back
                  </button>
                  <Link
                    href="/"
                    className="btn-primary flex items-center gap-2"
                  >
                    Go to Team Inbox <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
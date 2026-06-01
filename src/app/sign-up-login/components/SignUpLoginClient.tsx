'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';

import AppLogo from '@/components/ui/AppLogo';
import {
  Eye,
  EyeOff,
  ArrowRight,
  Check,
  MessageSquare,
  Bot,
  Globe,
  Zap,
  Copy,
  CheckCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

type LoginForm = {
  email: string;
  password: string;
  remember: boolean;
};

type SignupForm = {
  name: string;
  businessName: string;
  email: string;
  password: string;
  country: string;
  terms: boolean;
};

interface DemoCredential {
  role: string;
  email: string;
  password: string;
}

const demoCredentials: DemoCredential[] = [
  { role: 'SMB Admin', email: 'maya@batikcraft.id', password: 'Demo@Into23!' },
  { role: 'Support Agent', email: 'priya@batikcraft.id', password: 'Agent@Into23!' },
  { role: 'Team Lead', email: 'raj@cloudstack.in', password: 'Lead@Into23!' },
];

const valueProps = [
  { icon: <MessageSquare size={16} />, text: 'WhatsApp-native inbox — not a bolt-on' },
  { icon: <Bot size={16} />, text: '40% AI deflection guaranteed in 30 days' },
  { icon: <Globe size={16} />, text: 'Bahasa, Thai, Vietnamese, Tamil, Hindi' },
  { icon: <Zap size={16} />, text: 'Flat $149–249/mo for up to 5 agents' },
];

export default function SignUpLoginClient() {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const router = useRouter();
  const { signIn, signUp } = useAuth();

  const loginForm = useForm<LoginForm>({ defaultValues: { remember: false } });
  const signupForm = useForm<SignupForm>();

  const [loginLoading, setLoginLoading] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);

  const handleCopy = (value: string, key: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedField(key);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  const handleUseDemoCredential = (cred: DemoCredential) => {
    loginForm.setValue('email', cred.email);
    loginForm.setValue('password', cred.password);
    setActiveTab('login');
    toast.info(`Demo credentials for ${cred.role} filled in`);
  };

  const onLogin = async (data: LoginForm) => {
    setLoginLoading(true);
    try {
      await signIn(data.email, data.password);
      toast.success('Signed in successfully');
      router.push('/');
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || 'Invalid credentials. Please try again.');
      loginForm.setError('email', { message: error?.message || 'Invalid credentials' });
    } finally {
      setLoginLoading(false);
    }
  };

  const onSignup = async (data: SignupForm) => {
    setSignupLoading(true);
    try {
      await signUp(data.email, data.password, {
        fullName: data.name,
      });
      toast.success('Account created! Starting your 17-day free trial.');
      router.push('/onboarding-setup-wizard');
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create account. Please try again.');
    } finally {
      setSignupLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Brand Panel */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] xl:w-[520px] flex-shrink-0 gradient-brand p-10 text-white">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <AppLogo size={36} />
            <span className="text-xl font-800 tracking-tight">SwiftDesk</span>
          </div>
          <h1 className="text-3xl font-800 leading-tight mb-4">
            WhatsApp support,<br />
            built for how your<br />
            customers actually talk.
          </h1>
          <p className="text-white/70 text-[15px] leading-relaxed mb-8">
            The only helpdesk natively built on WhatsApp Business API — not bolted on.
            Trusted by 200+ SMBs across Southeast Asia and India.
          </p>

          <div className="space-y-3">
            {valueProps.map((vp, i) => (
              <div key={`vp-${i + 1}`} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                  {vp.icon}
                </div>
                <span className="text-[14px] text-white/90">{vp.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <div className="bg-white/10 rounded-xl p-5 backdrop-blur-sm">
          <p className="text-[14px] text-white/90 leading-relaxed italic mb-3">
            &ldquo;We cut our response time from 4 hours to 18 minutes. The AI handles 52% of
            our Shopee queries automatically — in Bahasa Indonesia.&rdquo;
          </p>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-[13px] font-700">
              M
            </div>
            <div>
              <p className="text-[13px] font-600">Maya Wijaya</p>
              <p className="text-[11px] text-white/60">Founder, BatikCraft.id · Jakarta</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-[420px]">
          {/* Mobile Logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <AppLogo size={32} />
            <span className="text-[17px] font-800 text-foreground">SwiftDesk</span>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-secondary rounded-lg mb-6">
            <button
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-2 text-[13px] font-600 rounded-md transition-colors ${
                activeTab === 'login' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setActiveTab('signup')}
              className={`flex-1 py-2 text-[13px] font-600 rounded-md transition-colors ${
                activeTab === 'signup' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Start Free Trial
            </button>
          </div>

          {activeTab === 'login' ? (
            <LoginFormComponent
              form={loginForm}
              onSubmit={onLogin}
              loading={loginLoading}
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
            />
          ) : (
            <SignupFormComponent
              form={signupForm}
              onSubmit={onSignup}
              loading={signupLoading}
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
            />
          )}

          {/* Demo Credentials */}
          <div className="mt-6 border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-secondary border-b border-border">
              <p className="text-[12px] font-600 text-muted-foreground">
                Demo accounts — click to autofill
              </p>
            </div>
            <div className="divide-y divide-border">
              {demoCredentials.map((cred) => (
                <div
                  key={`demo-${cred.role.replace(/\s+/g, '-').toLowerCase()}`}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-secondary/50 transition-colors"
                >
                  <div>
                    <p className="text-[12px] font-600 text-foreground">{cred.role}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{cred.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(cred.email, `email-${cred.role}`)}
                      className="btn-ghost p-1.5"
                      aria-label={`Copy ${cred.role} email`}
                    >
                      {copiedField === `email-${cred.role}` ? (
                        <CheckCheck size={13} className="text-success" />
                      ) : (
                        <Copy size={13} />
                      )}
                    </button>
                    <button
                      onClick={() => handleUseDemoCredential(cred)}
                      className="text-[11px] font-600 text-primary hover:underline"
                    >
                      Use
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginFormComponent({
  form,
  onSubmit,
  loading,
  showPassword,
  onTogglePassword,
}: {
  form: ReturnType<typeof useForm<LoginForm>>;
  onSubmit: (data: LoginForm) => void;
  loading: boolean;
  showPassword: boolean;
  onTogglePassword: () => void;
}) {
  const { register, handleSubmit, formState: { errors } } = form;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="login-email" className="block text-[13px] font-600 text-foreground mb-1.5">
          Work Email
        </label>
        <input
          id="login-email"
          type="email"
          placeholder="you@company.com"
          {...register('email', {
            required: 'Email is required',
            pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
          })}
          className={`input-field ${errors.email ? 'error' : ''}`}
        />
        {errors.email && (
          <p className="text-[12px] text-danger mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="login-password" className="text-[13px] font-600 text-foreground">
            Password
          </label>
          <button type="button" className="text-[12px] text-primary hover:underline">
            Forgot password?
          </button>
        </div>
        <div className="relative">
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            {...register('password', { required: 'Password is required' })}
            className={`input-field pr-10 ${errors.password ? 'error' : ''}`}
          />
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        {errors.password && (
          <p className="text-[12px] text-danger mt-1">{errors.password.message}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          id="login-remember"
          type="checkbox"
          {...register('remember')}
          className="w-4 h-4 rounded border-input accent-primary"
        />
        <label htmlFor="login-remember" className="text-[13px] text-muted-foreground">
          Keep me signed in
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full py-2.5 text-[14px]"
      >
        {loading ? (
          <span className="flex items-center gap-2 justify-center">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Signing in...
          </span>
        ) : (
          <span className="flex items-center gap-2 justify-center">
            Sign In <ArrowRight size={15} />
          </span>
        )}
      </button>
    </form>
  );
}

function SignupFormComponent({
  form,
  onSubmit,
  loading,
  showPassword,
  onTogglePassword,
}: {
  form: ReturnType<typeof useForm<SignupForm>>;
  onSubmit: (data: SignupForm) => void;
  loading: boolean;
  showPassword: boolean;
  onTogglePassword: () => void;
}) {
  const { register, handleSubmit, formState: { errors } } = form;

  const countries = [
    { value: 'id', label: 'Indonesia' },
    { value: 'in', label: 'India' },
    { value: 'th', label: 'Thailand' },
    { value: 'vn', label: 'Vietnam' },
    { value: 'ph', label: 'Philippines' },
    { value: 'my', label: 'Malaysia' },
    { value: 'sg', label: 'Singapore' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="p-3 bg-success/5 border border-success/20 rounded-lg flex items-center gap-2">
        <Check size={14} className="text-success flex-shrink-0" />
        <p className="text-[12px] text-success font-500">17-day free trial · No credit card required</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="signup-name" className="block text-[13px] font-600 text-foreground mb-1.5">
            Your Name
          </label>
          <input
            id="signup-name"
            type="text"
            placeholder="Maya Wijaya"
            {...register('name', { required: 'Name is required' })}
            className={`input-field ${errors.name ? 'error' : ''}`}
          />
          {errors.name && <p className="text-[11px] text-danger mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label htmlFor="signup-business" className="block text-[13px] font-600 text-foreground mb-1.5">
            Business Name
          </label>
          <input
            id="signup-business"
            type="text"
            placeholder="BatikCraft.id"
            {...register('businessName', { required: 'Business name is required' })}
            className={`input-field ${errors.businessName ? 'error' : ''}`}
          />
          {errors.businessName && <p className="text-[11px] text-danger mt-1">{errors.businessName.message}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="signup-email" className="block text-[13px] font-600 text-foreground mb-1.5">
          Work Email
        </label>
        <input
          id="signup-email"
          type="email"
          placeholder="you@company.com"
          {...register('email', {
            required: 'Email is required',
            pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
          })}
          className={`input-field ${errors.email ? 'error' : ''}`}
        />
        {errors.email && <p className="text-[12px] text-danger mt-1">{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="signup-country" className="block text-[13px] font-600 text-foreground mb-1.5">
          Country
        </label>
        <select
          id="signup-country"
          {...register('country', { required: 'Country is required' })}
          className={`input-field ${errors.country ? 'error' : ''}`}
        >
          <option value="">Select your country</option>
          {countries.map((c) => (
            <option key={`country-${c.value}`} value={c.value}>{c.label}</option>
          ))}
        </select>
        {errors.country && <p className="text-[12px] text-danger mt-1">{errors.country.message}</p>}
      </div>

      <div>
        <label htmlFor="signup-password" className="block text-[13px] font-600 text-foreground mb-1.5">
          Password
        </label>
        <p className="text-[11px] text-muted-foreground mb-1.5">Min 8 characters with a number and symbol</p>
        <div className="relative">
          <input
            id="signup-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Create a strong password"
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 8, message: 'Min 8 characters' },
            })}
            className={`input-field pr-10 ${errors.password ? 'error' : ''}`}
          />
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        {errors.password && <p className="text-[12px] text-danger mt-1">{errors.password.message}</p>}
      </div>

      <div className="flex items-start gap-2">
        <input
          id="signup-terms"
          type="checkbox"
          {...register('terms', { required: 'You must accept the terms' })}
          className="w-4 h-4 rounded border-input accent-primary mt-0.5"
        />
        <label htmlFor="signup-terms" className="text-[12px] text-muted-foreground leading-relaxed">
          I agree to the{' '}
          <span className="text-primary hover:underline cursor-pointer">Terms of Service</span>
          {' '}and{' '}
          <span className="text-primary hover:underline cursor-pointer">Privacy Policy</span>
        </label>
      </div>
      {errors.terms && <p className="text-[12px] text-danger">{errors.terms.message}</p>}

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full py-2.5 text-[14px]"
      >
        {loading ? (
          <span className="flex items-center gap-2 justify-center">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Creating your account...
          </span>
        ) : (
          <span className="flex items-center gap-2 justify-center">
            Start 17-Day Free Trial <ArrowRight size={15} />
          </span>
        )}
      </button>
    </form>
  );
}
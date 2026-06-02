/**
 * Meta Embedded Signup for WhatsApp Cloud API.
 *
 * Flow:
 *   1. User clicks "Connect WhatsApp" in onboarding wizard
 *   2. Meta popup opens, user signs in to Business Manager
 *   3. User picks or creates a WhatsApp Business Account + phone number
 *   4. Meta redirects with a `code` (and optionally phone_number_id)
 *   5. We POST to /api/workspaces/[id]/whatsapp/connect with the code
 *   6. Server exchanges the code for an access token + phone number ID
 *   7. Server stores them in the workspaces row
 *
 * For the demo (before Meta App is configured), the user can also paste
 * a phone_number_id + access_token manually. That bypasses the OAuth dance.
 */
'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { MessageSquare, Loader2, ExternalLink, CheckCircle } from 'lucide-react';

declare global {
  interface Window {
    FB?: any;
  }
}

interface WhatsAppConnectProps {
  workspaceId: string;
  // After a successful connect, the wizard re-renders with the new state
  onConnected?: () => void;
}

export default function WhatsAppConnect({ workspaceId, onConnected }: WhatsAppConnectProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualPhoneId, setManualPhoneId] = useState('');
  const [manualAccessToken, setManualAccessToken] = useState('');

  const META_CONFIG_ID = process.env.NEXT_PUBLIC_META_CONFIG_ID;
  const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID;

  // ── Real Meta Embedded Signup flow ──────────────────────────────────────
  const launchMetaSignup = async () => {
    if (!META_CONFIG_ID || !META_APP_ID) {
      setError('Meta App not configured. Set NEXT_PUBLIC_META_APP_ID + NEXT_PUBLIC_META_CONFIG_ID, or use manual mode.');
      setManualMode(true);
      return;
    }

    setStatus('connecting');
    setError(null);

    try {
      // Load the FB SDK if not present
      if (!window.FB) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://connect.facebook.net/en_US/messenger/embedded_signup/sdk.js';
          script.async = true;
          script.defer = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Meta SDK'));
          document.head.appendChild(script);
        });
      }

      window.FB.init({
        appId: META_APP_ID,
        autoLogAppEvents: true,
        xfbml: true,
        version: 'v21.0',
      });

      window.FB.login(
        (response: any) => {
          if (response.authResponse) {
            const code = response.authResponse.code;
            exchangeCode(code);
          } else {
            setStatus('idle');
            toast.error('WhatsApp connection cancelled');
          }
        },
        {
          config_id: META_CONFIG_ID,
          response_type: 'code',
          override_default_response_type: true,
          extras: {
            setup: {
              ...(process.env.NEXT_PUBLIC_META_EXPERIENCE_ID && {
                experience_id: process.env.NEXT_PUBLIC_META_EXPERIENCE_ID,
                business_config_id: process.env.NEXT_PUBLIC_META_BUSINESS_CONFIG_ID,
              }),
              session_id: `swiftdesk-${Date.now()}`,
            },
          },
        }
      );
    } catch (err: any) {
      setStatus('error');
      setError(err.message);
      toast.error('Failed to launch WhatsApp signup: ' + err.message);
    }
  };

  const exchangeCode = async (code: string) => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/whatsapp/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to connect WhatsApp');

      setStatus('connected');
      toast.success('WhatsApp connected!');
      onConnected?.();
    } catch (err: any) {
      setStatus('error');
      setError(err.message);
      toast.error('Connection failed: ' + err.message);
    }
  };

  // ── Manual mode (paste creds directly) ──────────────────────────────────
  const submitManual = async () => {
    if (!manualPhoneId || !manualAccessToken) {
      toast.error('Both fields are required');
      return;
    }
    setStatus('connecting');
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/whatsapp/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number_id: manualPhoneId,
          access_token: manualAccessToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to connect');
      setStatus('connected');
      toast.success('WhatsApp connected!');
      onConnected?.();
    } catch (err: any) {
      setStatus('error');
      setError(err.message);
      toast.error('Connection failed: ' + err.message);
    }
  };

  if (status === 'connected') {
    return (
      <div className="card bg-success/5 border-success/20">
        <div className="flex items-center gap-3">
          <CheckCircle size={20} className="text-success flex-shrink-0" />
          <div>
            <p className="text-[14px] font-700 text-foreground">WhatsApp connected</p>
            <p className="text-[12px] text-muted-foreground">Your business WhatsApp number is now linked to SwiftDesk.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card space-y-3">
      {!manualMode ? (
        <>
          <div className="flex items-start gap-3">
            <MessageSquare size={20} className="text-success flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[14px] font-700 text-foreground">Connect your WhatsApp Business number</p>
              <p className="text-[12px] text-muted-foreground">
                Link your business WhatsApp number via Meta Embedded Signup. You'll need admin access to your Meta Business Manager.
              </p>
            </div>
          </div>
          {error && (
            <p className="text-[12px] text-danger bg-danger/5 border border-danger/20 rounded p-2">{error}</p>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={launchMetaSignup}
              disabled={status === 'connecting'}
              className="btn-primary text-[13px] py-2 flex items-center gap-1.5"
            >
              {status === 'connecting' ? (
                <><Loader2 size={14} className="animate-spin" /> Connecting…</>
              ) : (
                <><MessageSquare size={14} /> Connect via Meta</>
              )}
            </button>
            <button
              onClick={() => setManualMode(true)}
              className="btn-ghost text-[12px] py-2 flex items-center gap-1.5"
            >
              <ExternalLink size={12} /> Paste credentials
            </button>
          </div>
        </>
      ) : (
        <>
          <div>
            <p className="text-[13px] font-700 text-foreground mb-1">Paste your WhatsApp credentials</p>
            <p className="text-[11px] text-muted-foreground mb-2">
              From your Meta App Dashboard → WhatsApp → API Setup. Get the Phone Number ID and a permanent access token.
            </p>
          </div>
          <div>
            <label className="block text-[11px] font-600 text-muted-foreground mb-1">Phone Number ID</label>
            <input
              type="text"
              value={manualPhoneId}
              onChange={(e) => setManualPhoneId(e.target.value)}
              placeholder="123456789012345"
              className="input-field text-[12px] font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] font-600 text-muted-foreground mb-1">Permanent Access Token</label>
            <input
              type="password"
              value={manualAccessToken}
              onChange={(e) => setManualAccessToken(e.target.value)}
              placeholder="EAAJ..."
              className="input-field text-[12px] font-mono"
            />
          </div>
          {error && (
            <p className="text-[12px] text-danger bg-danger/5 border border-danger/20 rounded p-2">{error}</p>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={submitManual}
              disabled={status === 'connecting'}
              className="btn-primary text-[12px] py-1.5"
            >
              {status === 'connecting' ? <><Loader2 size={12} className="animate-spin" /> Saving…</> : 'Save credentials'}
            </button>
            <button onClick={() => setManualMode(false)} className="btn-ghost text-[12px] py-1.5">
              Back to Meta signup
            </button>
          </div>
        </>
      )}
    </div>
  );
}

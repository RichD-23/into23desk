/**
 * Auth context with workspace support.
 *
 * On sign-in, the user is a member of one or more workspaces. The current
 * workspace is stored in localStorage and rehydrated on mount. Switching
 * workspaces triggers a refresh of all workspace-scoped data.
 *
 * For now, we store the current workspace ID in a cookie so server-side
 * routes can read it (for the auth middleware). The client context also
 * reads it for the React components.
 */
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan_id: 'starter' | 'pro' | 'enterprise';
  trial_ends_at: string;
  is_active: boolean;
  role: 'admin' | 'agent' | 'team_lead';
}

interface AuthContextValue {
  user: any;
  session: any;
  loading: boolean;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  switchWorkspace: (id: string) => Promise<void>;
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({} as AuthContextValue);
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

const WORKSPACE_COOKIE = 'swiftdesk_current_workspace';

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 86400_000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Expires=${expires}; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const loadWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      return;
    }
    const { data: { session: sess } } = await supabase.auth.getSession();
    if (!sess) return;

    const res = await fetch('/api/workspaces', {
      headers: { Authorization: `Bearer ${sess.access_token}` },
    });
    if (!res.ok) return;
    const { workspaces: ws } = await res.json();
    setWorkspaces(ws || []);

    // Pick the current workspace: cookie > first
    const cookieWsId = getCookie(WORKSPACE_COOKIE);
    const match = ws?.find((w: Workspace) => w.id === cookieWsId);
    const chosen = match || ws?.[0] || null;
    setCurrentWorkspace(chosen);
    if (chosen) setCookie(WORKSPACE_COOKIE, chosen.id);
  }, [user, supabase]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    loadWorkspaces();
  }, [user, loadWorkspaces]);

  const switchWorkspace = useCallback(async (id: string) => {
    const ws = workspaces.find((w) => w.id === id);
    if (!ws) return;
    setCurrentWorkspace(ws);
    setCookie(WORKSPACE_COOKIE, id);
    // Force a refresh so all workspace-scoped data re-fetches
    router.refresh();
  }, [workspaces, router]);

  const signUp = async (email: string, password: string, metadata: Record<string, any> = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: metadata?.fullName || '',
          avatar_url: metadata?.avatarUrl || '',
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;

    // Auto-create a workspace for the new user
    if (data.user) {
      const wsName = metadata?.businessName || `${metadata?.fullName || email.split('@')[0]}'s Workspace`;
      const wsRes = await fetch('/api/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session?.access_token || ''}`,
        },
        body: JSON.stringify({ name: wsName }),
      });
      // If create-workspace fails (e.g., session not yet established), the user
      // can create one from the onboarding wizard. Don't fail signup.
    }

    return data;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setSession(null);
    setWorkspaces([]);
    setCurrentWorkspace(null);
  };

  const value: AuthContextValue = {
    user, session, loading,
    workspaces, currentWorkspace,
    switchWorkspace,
    signUp, signIn, signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { MessageSquare, BarChart2, BookOpen, Settings, ChevronLeft, ChevronRight, Users, HelpCircle, Bell, LogOut, Bot, CreditCard } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  badgeVariant?: 'default' | 'warning' | 'danger';
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    id: 'group-workspace',
    label: 'Workspace',
    items: [
      {
        id: 'nav-inbox',
        label: 'Team Inbox',
        href: '/',
        icon: <MessageSquare size={18} />,
        badge: 7,
        badgeVariant: 'danger',
      },
      {
        id: 'nav-contacts',
        label: 'Contacts',
        href: '/contacts',
        icon: <Users size={18} />,
      },
    ],
  },
  {
    id: 'group-ai',
    label: 'AI & Automation',
    items: [
      {
        id: 'nav-kb',
        label: 'Knowledge Base',
        href: '/knowledge-base-management',
        icon: <BookOpen size={18} />,
        badge: 3,
        badgeVariant: 'warning',
      },
      {
        id: 'nav-ai',
        label: 'AI Deflection',
        href: '/ai-deflection',
        icon: <Bot size={18} />,
      },
    ],
  },
  {
    id: 'group-insights',
    label: 'Insights',
    items: [
      {
        id: 'nav-analytics',
        label: 'Analytics',
        href: '/analytics-dashboard',
        icon: <BarChart2 size={18} />,
      },
    ],
  },
  {
    id: 'group-admin',
    label: 'Administration',
    items: [
      {
        id: 'nav-billing',
        label: 'Billing',
        href: '/billing-dashboard',
        icon: <CreditCard size={18} />,
      },
      {
        id: 'nav-settings',
        label: 'Settings',
        href: '/account-settings-configuration',
        icon: <Settings size={18} />,
      },
    ],
  },
];

const BadgeColors: Record<string, string> = {
  default: 'bg-primary text-primary-foreground',
  warning: 'bg-warning text-white',
  danger: 'bg-danger text-white',
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<{ full_name?: string; role?: string; initials?: string; color_class?: string } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    supabase
      .from('user_profiles')
      .select('full_name, role, initials, color_class')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data || null));
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/sign-up-login');
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Agent';
  const displayRole = profile?.role || 'agent';
  const initials = profile?.initials || displayName.charAt(0).toUpperCase();
  const colorClass = profile?.color_class || 'bg-primary text-primary-foreground';

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className="relative flex flex-col h-full bg-card border-r border-border sidebar-transition overflow-hidden flex-shrink-0"
      style={{ width: collapsed ? '64px' : '240px' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border min-h-[60px]">
        <AppLogo size={32} />
        {!collapsed && (
          <span className="font-bold text-[15px] text-foreground tracking-tight whitespace-nowrap">
            SwiftDesk
          </span>
        )}
      </div>

      {/* Nav Groups */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 scrollbar-thin">
        {navGroups.map((group) => (
          <div key={group.id} className="mb-4">
            {!collapsed && (
              <p className="px-4 py-1 text-[10px] font-700 uppercase tracking-widest text-muted-foreground mb-1">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <div key={item.id} className="relative group px-2">
                  <Link
                    href={item.href}
                    className={`nav-item ${active ? 'active' : ''}`}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    {!collapsed && (
                      <span className="flex-1 truncate">{item.label}</span>
                    )}
                    {!collapsed && item.badge && (
                      <span
                        className={`status-badge text-[10px] px-1.5 py-0 min-w-[18px] justify-center ${BadgeColors[item.badgeVariant || 'default']}`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {collapsed && item.badge && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger" />
                    )}
                  </Link>
                  {collapsed && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-foreground text-background text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity duration-150">
                      {item.label}
                      {item.badge && (
                        <span className="ml-1 text-warning">({item.badge})</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="border-t border-border p-2">
        {/* Notifications */}
        <div className="relative group px-0 mb-1">
          <button className={`nav-item w-full ${collapsed ? 'justify-center' : ''}`}>
            <Bell size={18} className="flex-shrink-0" />
            {!collapsed && <span className="flex-1 text-left">Notifications</span>}
            {!collapsed && (
              <span className="status-badge text-[10px] px-1.5 py-0 min-w-[18px] justify-center bg-primary text-primary-foreground">
                2
              </span>
            )}
          </button>
          {collapsed && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-foreground text-background text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity">
              Notifications (2)
            </div>
          )}
        </div>

        {/* Help */}
        <div className="relative group px-0 mb-1">
          <Link href="/onboarding-setup-wizard" className={`nav-item ${collapsed ? 'justify-center' : ''}`}>
            <HelpCircle size={18} className="flex-shrink-0" />
            {!collapsed && <span className="flex-1">Setup Wizard</span>}
          </Link>
          {collapsed && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-foreground text-background text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity">
              Setup Wizard
            </div>
          )}
        </div>

        {/* User Profile */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-2 py-2 mt-1 rounded-lg hover:bg-secondary cursor-pointer transition-colors w-full text-left"
          title="Sign out"
        >
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${colorClass}`}>
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-600 text-foreground truncate">{displayName}</p>
              <p className="text-[10px] text-muted-foreground truncate capitalize">{displayRole}</p>
            </div>
          )}
          {!collapsed && <LogOut size={14} className="text-muted-foreground flex-shrink-0" />}
        </button>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[72px] w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors z-10 shadow-sm"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}
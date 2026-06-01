'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Bot, Clock, Star, MessageSquare, AlertCircle, TrendingUp, Minus, Download, RefreshCw, ArrowUp, ArrowDown } from 'lucide-react';
import dynamic from 'next/dynamic';
import { agentPerformanceData } from './analyticsData';
import { createClient } from '@/lib/supabase/client';

const ConversationVolumeChart = dynamic(() => import('./ConversationVolumeChart'), { ssr: false });
const DeflectionTopicsChart = dynamic(() => import('./DeflectionTopicsChart'), { ssr: false });
const FRTTrendChart = dynamic(() => import('./FRTTrendChart'), { ssr: false });
const LanguageDistributionChart = dynamic(() => import('./LanguageDistributionChart'), { ssr: false });

type DateRange = '7d' | '14d' | '30d' | 'custom';

interface KpiCardProps {
  label: string;
  value: string;
  subtext: string;
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
  trendPositive: boolean;
  icon: React.ReactNode;
  accent?: 'primary' | 'success' | 'warning' | 'danger' | 'ai';
  size?: 'hero' | 'normal';
  alert?: boolean;
}

const accentClasses: Record<string, string> = {
  primary: 'text-primary bg-primary/5 border-primary/10',
  success: 'text-success bg-success/5 border-success/10',
  warning: 'text-warning bg-warning/5 border-warning/10',
  danger: 'text-danger bg-danger/5 border-danger/10',
  ai: 'text-ai bg-ai/5 border-ai/10',
};

const iconBgClasses: Record<string, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  ai: 'bg-ai/10 text-ai',
};

function KpiCard({
  label, value, subtext, trend, trendValue, trendPositive, icon,
  accent = 'primary', size = 'normal', alert = false,
}: KpiCardProps) {
  const TrendIcon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Minus;
  return (
    <div className={`card card-hover relative overflow-hidden ${alert ? 'border-danger/30 bg-danger/5' : ''} ${size === 'hero' ? 'p-6' : 'p-4'}`}>
      {alert && (
        <div className="absolute top-0 right-0 w-0 h-0 border-l-[20px] border-l-transparent border-t-[20px] border-t-danger/40" />
      )}
      <div className="flex items-start justify-between mb-3">
        <p className={`text-[11px] font-700 uppercase tracking-widest ${alert ? 'text-danger' : 'text-muted-foreground'}`}>
          {label}
        </p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBgClasses[accent]}`}>
          {icon}
        </div>
      </div>
      <p className={`tabular-nums font-800 text-foreground ${size === 'hero' ? 'text-4xl' : 'text-2xl'}`}>
        {value}
      </p>
      <div className="flex items-center justify-between mt-2">
        <p className="text-[11px] text-muted-foreground">{subtext}</p>
        <div className={`flex items-center gap-0.5 text-[11px] font-600 ${trendPositive ? 'text-success' : 'text-danger'}`}>
          <TrendIcon size={11} />
          {trendValue}
        </div>
      </div>
    </div>
  );
}

const statusDot: Record<string, string> = {
  online: 'bg-success',
  away: 'bg-warning',
  offline: 'bg-muted-foreground',
};

interface AgentRow {
  id: string;
  name: string;
  initials: string;
  color: string;
  status: string;
  languages: string[];
  assigned: number;
  resolved: number;
  avgFrt: string;
  frtRaw: number;
  csat: number;
  onlineHours: string;
}

export default function AnalyticsDashboardContent() {
  const [dateRange, setDateRange] = useState<DateRange>('14d');
  const [sortCol, setSortCol] = useState<string>('assigned');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [convStats, setConvStats] = useState({ total: 0, open: 0, unassigned: 0 });
  const [loadingAgents, setLoadingAgents] = useState(true);
  const supabase = createClient();

  const fetchLiveData = useCallback(async () => {
    try {
      // Fetch team members (user_profiles)
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, full_name, initials, color_class, agent_status, languages')
        .eq('is_active', true);

      if (profiles && profiles.length > 0) {
        // Merge with static performance data for demo metrics
        const merged: AgentRow[] = profiles.map((p: any, idx: number) => {
          const staticAgent = agentPerformanceData[idx % agentPerformanceData.length];
          return {
            id: p.id,
            name: p.full_name || staticAgent.name,
            initials: p.initials || staticAgent.initials,
            color: p.color_class || staticAgent.color,
            status: p.agent_status || 'offline',
            languages: p.languages || staticAgent.languages,
            assigned: staticAgent.assigned,
            resolved: staticAgent.resolved,
            avgFrt: staticAgent.avgFrt,
            frtRaw: staticAgent.frtRaw,
            csat: staticAgent.csat,
            onlineHours: staticAgent.onlineHours,
          };
        });
        setAgents(merged);
      } else {
        // Fallback to static data
        setAgents(agentPerformanceData.map((a) => ({
          ...a,
          status: a.status,
          languages: a.languages,
        })));
      }

      // Fetch conversation stats
      const { count: totalCount } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true });

      const { count: openCount } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');

      const { count: unassignedCount } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open')
        .is('assigned_agent_id', null);

      setConvStats({
        total: totalCount || 0,
        open: openCount || 0,
        unassigned: unassignedCount || 0,
      });
    } catch (err: any) {
      console.log('Analytics fetch error:', err.message);
      setAgents(agentPerformanceData.map((a) => ({ ...a })));
    } finally {
      setLoadingAgents(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveData();
  }, [fetchLiveData]);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  const sortedAgents = [...agents].sort((a, b) => {
    const aVal = a[sortCol as keyof AgentRow];
    const bVal = b[sortCol as keyof AgentRow];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return sortDir === 'asc'
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  const dateRanges: { id: DateRange; label: string }[] = [
    { id: '7d', label: 'Last 7 days' },
    { id: '14d', label: 'Last 14 days' },
    { id: '30d', label: 'Last 30 days' },
    { id: 'custom', label: 'Custom range' },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-thin">
      {/* Page Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card flex-shrink-0">
        <div>
          <h1 className="text-xl font-700 text-foreground">Analytics</h1>
          <p className="text-[13px] text-muted-foreground">
            Team performance · {convStats.total > 0 ? `${convStats.total} total conversations` : 'Loading...'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-secondary rounded-lg">
            {dateRanges.map((r) => (
              <button
                key={`range-${r.id}`}
                onClick={() => setDateRange(r.id)}
                className={`px-3 py-1.5 text-[12px] font-600 rounded transition-colors ${
                  dateRange === r.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button onClick={fetchLiveData} className="btn-secondary text-[12px] py-1.5 px-3 flex items-center gap-1.5">
            <RefreshCw size={13} />
            Refresh
          </button>
          <button className="btn-secondary text-[12px] py-1.5 px-3 flex items-center gap-1.5">
            <Download size={13} />
            Export
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-screen-2xl mx-auto w-full">
        {/* KPI Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
          <div className="lg:col-span-2">
            <KpiCard
              label="AI Deflection Rate"
              value="46.3%"
              subtext="Guarantee: 40% · 2,348 conversations auto-resolved"
              trend="up"
              trendValue="+3.1% vs last period"
              trendPositive={true}
              icon={<Bot size={16} />}
              accent="ai"
              size="hero"
            />
          </div>
          <KpiCard
            label="Avg CSAT Score"
            value="4.4 / 5"
            subtext="Based on 891 ratings this period"
            trend="down"
            trendValue="-0.2 vs last period"
            trendPositive={false}
            icon={<Star size={15} />}
            accent="warning"
          />
          <KpiCard
            label="Conversations"
            value={convStats.total > 0 ? convStats.total.toLocaleString() : '2,834'}
            subtext="17 days · +12% vs prior period"
            trend="up"
            trendValue="+308 conversations"
            trendPositive={true}
            icon={<MessageSquare size={15} />}
            accent="primary"
          />
          <KpiCard
            label="Avg First Response"
            value="4.7 min"
            subtext="SLA target: 5 min · 89% within SLA"
            trend="down"
            trendValue="-1.2 min vs last period"
            trendPositive={true}
            icon={<Clock size={15} />}
            accent="success"
          />
          <KpiCard
            label="Avg Resolution Time"
            value="22.4 min"
            subtext="Human-handled conversations only"
            trend="up"
            trendValue="+4.1 min vs last period"
            trendPositive={false}
            icon={<TrendingUp size={15} />}
            accent="warning"
          />
          <KpiCard
            label="Unassigned Queue"
            value={convStats.unassigned > 0 ? String(convStats.unassigned) : '7'}
            subtext="Oldest waiting: 28 min — action needed"
            trend="up"
            trendValue="+4 since 11:00"
            trendPositive={false}
            icon={<AlertCircle size={15} />}
            accent="danger"
            alert={true}
          />

          {/* AI vs Human bar */}
          <div className="lg:col-span-2">
            <div className="card h-full">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[11px] font-700 uppercase tracking-widest text-muted-foreground mb-0.5">
                    AI vs Human Resolution
                  </p>
                  <p className="text-[13px] text-foreground font-500">
                    <span className="text-ai font-700">1,085</span> AI-deflected ·{' '}
                    <span className="text-primary font-700">1,263</span> human-handled
                  </p>
                </div>
                <Bot size={18} className="text-ai" />
              </div>
              <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                <div className="h-full rounded-l-full bg-ai" style={{ width: '46.3%' }} />
                <div className="h-full rounded-r-full bg-primary" style={{ width: '53.7%' }} />
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-ai" />
                  <span className="text-[11px] text-muted-foreground">AI Deflected 46.3%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-[11px] text-muted-foreground">Human 53.7%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-4">
          <div className="lg:col-span-2 card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[14px] font-700 text-foreground">Conversation Volume</h3>
                <p className="text-[12px] text-muted-foreground">Total vs AI-deflected over time</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1.5 rounded-full bg-primary" />
                  <span className="text-[11px] text-muted-foreground">Total</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1.5 rounded-full bg-accent" />
                  <span className="text-[11px] text-muted-foreground">AI Deflected</span>
                </div>
              </div>
            </div>
            <ConversationVolumeChart />
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[14px] font-700 text-foreground">First Response Time</h3>
                <p className="text-[12px] text-muted-foreground">vs 5-min SLA target</p>
              </div>
              <span className="status-badge status-resolved text-[10px]">89% within SLA</span>
            </div>
            <FRTTrendChart />
          </div>
        </div>

        {/* Second charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2 gap-4">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[14px] font-700 text-foreground">AI Deflection by Topic</h3>
                <p className="text-[12px] text-muted-foreground">Auto-resolved vs escalated to human</p>
              </div>
              <Bot size={16} className="text-ai" />
            </div>
            <DeflectionTopicsChart />
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[14px] font-700 text-foreground">Conversations by Language</h3>
                <p className="text-[12px] text-muted-foreground">Multilingual volume breakdown</p>
              </div>
            </div>
            <LanguageDistributionChart />
          </div>
        </div>

        {/* Agent Performance Table */}
        <div className="card overflow-hidden p-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h3 className="text-[14px] font-700 text-foreground">Agent Performance</h3>
              <p className="text-[12px] text-muted-foreground">
                {loadingAgents ? 'Loading...' : `${sortedAgents.length} agents`}
              </p>
            </div>
            <button className="btn-secondary text-[12px] py-1.5 px-3 flex items-center gap-1.5">
              <Download size={13} />
              Export CSV
            </button>
          </div>
          {loadingAgents ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    {[
                      { key: 'name', label: 'Agent' },
                      { key: 'status', label: 'Status' },
                      { key: 'assigned', label: 'Assigned' },
                      { key: 'resolved', label: 'Resolved' },
                      { key: 'frtRaw', label: 'Avg FRT' },
                      { key: 'csat', label: 'CSAT' },
                      { key: 'languages', label: 'Languages' },
                      { key: 'onlineHours', label: 'Online Today' },
                    ].map((col) => (
                      <th
                        key={`th-${col.key}`}
                        onClick={() => handleSort(col.key)}
                        className="px-4 py-3 text-left text-[11px] font-700 uppercase tracking-wide text-muted-foreground cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
                      >
                        <span className="flex items-center gap-1">
                          {col.label}
                          {sortCol === col.key && (
                            <span className="text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedAgents.map((agent, idx) => (
                    <tr
                      key={agent.id}
                      className={`border-b border-border/50 hover:bg-secondary/40 transition-colors ${idx % 2 === 0 ? '' : 'bg-secondary/20'}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-full text-[11px] font-700 flex items-center justify-center flex-shrink-0 ${agent.color}`}>
                            {agent.initials}
                          </div>
                          <span className="text-[13px] font-500 text-foreground whitespace-nowrap">{agent.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${statusDot[agent.status] || 'bg-muted-foreground'}`} />
                          <span className="text-[12px] text-muted-foreground capitalize">{agent.status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[13px] font-600 text-foreground tabular-nums">{agent.assigned}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-600 text-foreground tabular-nums">{agent.resolved}</span>
                          <div className="w-14 h-1.5 bg-border rounded-full overflow-hidden">
                            <div
                              className="h-full bg-success rounded-full"
                              style={{ width: `${(agent.resolved / Math.max(agent.assigned, 1)) * 100}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[13px] font-600 tabular-nums ${agent.frtRaw > 5 ? 'text-danger' : agent.frtRaw > 4 ? 'text-warning' : 'text-success'}`}>
                          {agent.avgFrt}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Star size={12} className="text-warning fill-warning" />
                          <span className="text-[13px] font-600 text-foreground tabular-nums">{agent.csat}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          {(agent.languages || []).map((lang) => (
                            <span key={`lang-${agent.id}-${lang}`} className="status-badge text-[10px] bg-secondary text-secondary-foreground">
                              {lang}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[12px] font-mono text-muted-foreground">{agent.onlineHours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
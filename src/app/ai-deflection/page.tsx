'use client';

import React, { useEffect, useState } from 'react';
import { Bot, BookOpen, Zap, TrendingUp, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import AppLayout from '@/components/AppLayout';

const LANG_LABELS: Record<string, string> = {
  en: 'EN', id: 'ID', th: 'TH', vi: 'VI', ta: 'TA', hi: 'HI', bn: 'BN',
};

export default function AIDeflectionPage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('kb_articles')
      .select('id, title, category, languages, ai_usage_count, deflection_score, views, status, author_name')
      .order('ai_usage_count', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error);
        setArticles(data || []);
        setLoading(false);
      });
  }, []);

  const published = articles.filter((a) => a.status === 'published');
  const draft = articles.filter((a) => a.status === 'draft');
  const totalUsage = published.reduce((s, a) => s + (a.ai_usage_count || 0), 0);
  const avgDeflection = published.length
    ? Math.round(
        published.reduce((s, a) => s + (a.deflection_score || 0), 0) / published.length
      )
    : 0;
  const totalViews = published.reduce((s, a) => s + (a.views || 0), 0);

  return (
    <AppLayout>
      <div className="flex flex-col h-full overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-card">
          <h1 className="text-[18px] font-800 text-foreground flex items-center gap-2">
            <Bot size={18} className="text-ai" />
            AI Deflection
          </h1>
          <p className="text-[12px] text-muted-foreground">
            How the knowledge base deflects customer questions automatically
          </p>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-32 gap-2 text-muted-foreground text-sm">
              <Loader2 size={14} className="animate-spin" /> Loading AI metrics…
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-4 gap-3">
                <StatCard
                  icon={<Zap size={16} className="text-ai" />}
                  label="AI Answers (30d)"
                  value={totalUsage.toLocaleString()}
                  accent
                />
                <StatCard
                  icon={<TrendingUp size={16} className="text-success" />}
                  label="Avg Deflection"
                  value={`${avgDeflection}%`}
                />
                <StatCard
                  icon={<BookOpen size={16} className="text-primary" />}
                  label="Published Articles"
                  value={published.length.toString()}
                />
                <StatCard
                  icon={<BookOpen size={16} className="text-muted-foreground" />}
                  label="Article Views"
                  value={totalViews.toLocaleString()}
                />
              </div>

              {/* How it works */}
              <div className="card">
                <h3 className="text-[14px] font-700 text-foreground mb-2 flex items-center gap-2">
                  <Bot size={14} className="text-ai" />
                  How it works
                </h3>
                <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                  When a customer sends a WhatsApp message, the AI searches your knowledge base
                  in real time. If a published article matches, the AI drafts a reply grounded
                  in that article — in the customer's language. Agents see the suggestion in
                  the inbox and can use it as-is, edit it, or ignore it. Every article use
                  counts toward its{' '}
                  <span className="font-600 text-foreground">ai_usage_count</span>, and every
                  message the AI handles without an agent touching it counts as a{' '}
                  <span className="font-600 text-foreground">deflection</span>.
                </p>
              </div>

              {/* Top articles */}
              <div>
                <h3 className="text-[14px] font-700 text-foreground mb-2 flex items-center gap-2">
                  <BookOpen size={14} className="text-primary" />
                  Top performing articles
                </h3>
                <div className="space-y-2">
                  {published.map((a) => (
                    <div key={a.id} className="card flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-ai/10 flex items-center justify-center text-ai flex-shrink-0">
                        <Bot size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-600 text-foreground truncate">{a.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {a.category} · by {a.author_name} ·{' '}
                          {(a.languages || []).map((l: string) => LANG_LABELS[l] || l).join(' / ')}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[13px] font-700 text-foreground tabular-nums">
                          {a.ai_usage_count?.toLocaleString() || 0}
                        </p>
                        <p className="text-[10px] text-muted-foreground">AI uses</p>
                      </div>
                      <div className="w-20 text-right flex-shrink-0">
                        <p className="text-[13px] font-700 text-success tabular-nums">
                          {a.deflection_score || 0}%
                        </p>
                        <div className="w-full h-1 bg-border rounded-full overflow-hidden mt-0.5">
                          <div
                            className="h-full bg-success rounded-full"
                            style={{ width: `${a.deflection_score || 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {draft.length > 0 && (
                <div>
                  <h3 className="text-[14px] font-700 text-foreground mb-2">Drafts ({draft.length})</h3>
                  <div className="space-y-2">
                    {draft.map((a) => (
                      <div key={a.id} className="card flex items-center gap-3 opacity-70">
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <BookOpen size={15} className="text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-600 text-foreground truncate">{a.title}</p>
                          <p className="text-[11px] text-muted-foreground">{a.category} · not yet indexed by AI</p>
                        </div>
                        <span className="status-badge text-[10px] status-draft">draft</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={`card ${accent ? 'bg-ai/5 border-ai/20' : ''}`}>
      <div className="flex items-center gap-2 mb-1.5">
        {icon}
        <span className="text-[11px] text-muted-foreground uppercase tracking-wide font-600">
          {label}
        </span>
      </div>
      <p className="text-[20px] font-800 text-foreground tabular-nums">{value}</p>
    </div>
  );
}

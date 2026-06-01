'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Bot, BookOpen, TrendingUp, Eye, Edit2, Trash2, Globe, Tag, BarChart2, Save, AlertCircle, Check, Loader2 } from 'lucide-react';
import { categories, type KBArticle, type ArticleLanguage } from './kbData';
import { toast } from 'sonner';
import Modal from '@/components/ui/Modal';
import { useChat } from '@/lib/hooks/useChat';
import { createClient } from '@/lib/supabase/client';

const statusClasses: Record<string, string> = {
  published: 'status-published',
  draft: 'status-draft',
  archived: 'status-archived',
};

const langLabels: Record<ArticleLanguage, string> = {
  en: 'EN', id: 'ID', th: 'TH', vi: 'VI', ta: 'TA', hi: 'HI',
};

const langFlagClasses: Record<ArticleLanguage, string> = {
  en: 'language-badge-en',
  id: 'language-badge-id',
  th: 'language-badge-th',
  vi: 'language-badge-vi',
  ta: 'language-badge-ta',
  hi: 'language-badge-hi',
};

function mapDbArticle(row: any): KBArticle {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    status: row.status,
    languages: row.languages || ['en'],
    aiUsageCount: row.ai_usage_count || 0,
    deflectionScore: row.deflection_score || 0,
    lastUpdated: row.updated_at ? new Date(row.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
    author: row.author_name || '',
    content: row.content || '',
    views: row.views || 0,
  };
}

export default function KnowledgeBaseContent() {
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [activeLanguage, setActiveLanguage] = useState<ArticleLanguage>('en');
  const [editorContent, setEditorContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [newArticleModalOpen, setNewArticleModalOpen] = useState(false);
  const [translatingLang, setTranslatingLang] = useState<ArticleLanguage | null>(null);
  const supabase = createClient();

  const {
    response: translationResponse,
    isLoading: translationLoading,
    error: translationError,
    sendMessage: sendTranslation,
  } = useChat('PERPLEXITY', 'perplexity/sonar-pro', false);

  const fetchArticles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('kb_articles')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.log('KB articles fetch error:', error.message);
        return;
      }

      const mapped = (data || []).map(mapDbArticle);
      setArticles(mapped);
      if (mapped.length > 0 && !selectedId) {
        setSelectedId(mapped[0].id);
      }
    } catch (err: any) {
      console.log('Fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, []);

  const selected = articles.find((a) => a.id === selectedId);

  React.useEffect(() => {
    if (selected) {
      setEditorContent(selected.content);
      setActiveLanguage('en');
    }
  }, [selectedId]);

  useEffect(() => {
    if (translationError) {
      toast.error('Translation failed: ' + translationError.message);
      setTranslatingLang(null);
    }
  }, [translationError]);

  const languages: ArticleLanguage[] = ['en', 'id', 'th', 'vi', 'ta', 'hi'];
  const languageNames: Record<ArticleLanguage, string> = {
    en: 'English', id: 'Bahasa ID', th: 'Thai', vi: 'Vietnamese', ta: 'Tamil', hi: 'Hindi',
  };

  useEffect(() => {
    if (translationResponse && !translationLoading && translatingLang) {
      setEditorContent(translationResponse.trim());
      toast.success(`Article translated to ${languageNames[translatingLang]} — review and save`);
      setTranslatingLang(null);
    }
  }, [translationResponse, translationLoading, translatingLang]);

  const filtered = articles.filter((a) => {
    const matchSearch =
      !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.category.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    const matchCategory = filterCategory === 'all' || a.category === filterCategory;
    return matchSearch && matchStatus && matchCategory;
  });

  const totalPublished = articles.filter((a) => a.status === 'published').length;
  const totalDraft = articles.filter((a) => a.status === 'draft').length;
  const totalAiUsage = articles.reduce((sum, a) => sum + a.aiUsageCount, 0);
  const avgDeflection = articles.filter((a) => a.deflectionScore > 0).length > 0
    ? Math.round(
        articles.filter((a) => a.deflectionScore > 0).reduce((sum, a) => sum + a.deflectionScore, 0) /
        articles.filter((a) => a.deflectionScore > 0).length
      )
    : 0;

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('kb_articles')
        .update({ content: editorContent, updated_at: new Date().toISOString() })
        .eq('id', selected.id);

      if (error) {
        console.log('Save error:', error.message);
        toast.error('Failed to save article');
      } else {
        toast.success('Article saved and AI index updated');
        fetchArticles();
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!selected) return;
    const { error } = await supabase
      .from('kb_articles')
      .update({ status: 'published', updated_at: new Date().toISOString() })
      .eq('id', selected.id);

    if (error) {
      toast.error('Failed to publish article');
    } else {
      toast.success(`"${selected.title}" published and available to AI deflection`);
      fetchArticles();
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    const { error } = await supabase.from('kb_articles').delete().eq('id', selected.id);
    setDeleteModalOpen(false);
    if (error) {
      toast.error('Failed to delete article');
    } else {
      toast.success('Article deleted and removed from AI index');
      setSelectedId('');
      fetchArticles();
    }
  };

  const handleAddTranslation = (lang: ArticleLanguage) => {
    if (!selected) return;
    const langName = languageNames[lang];
    setTranslatingLang(lang);
    setActiveLanguage(lang);
    sendTranslation([
      {
        role: 'system',
        content: `You are a professional translator specializing in customer support content. Translate the following knowledge base article to ${langName}. Preserve all formatting, structure, and meaning. Return ONLY the translated content, no explanations or meta-text.`,
      },
      {
        role: 'user',
        content: `Article title: ${selected.title}\n\nContent:\n${selected.content}`,
      },
    ], { temperature: 0.2, max_tokens: 1500 });
    toast.info(`Translating to ${langName}...`);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading knowledge base...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top Stats Bar */}
      <div className="flex items-center gap-6 px-6 py-3 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-primary" />
          <span className="text-[13px] text-muted-foreground">
            <span className="font-700 text-foreground">{totalPublished}</span> published
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Edit2 size={14} className="text-warning" />
          <span className="text-[13px] text-muted-foreground">
            <span className="font-700 text-foreground">{totalDraft}</span> drafts
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Bot size={14} className="text-ai" />
          <span className="text-[13px] text-muted-foreground">
            <span className="font-700 text-foreground tabular-nums">{totalAiUsage.toLocaleString()}</span> AI citations this month
          </span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-success" />
          <span className="text-[13px] text-muted-foreground">
            Avg deflection contribution:{' '}
            <span className="font-700 text-success">{avgDeflection}%</span>
          </span>
        </div>
        <div className="ml-auto">
          <button
            onClick={() => setNewArticleModalOpen(true)}
            className="btn-primary flex items-center gap-1.5 text-[13px]"
          >
            <Plus size={14} />
            New Article
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Article List Panel */}
        <div className="w-[320px] xl:w-[360px] flex-shrink-0 border-r border-border flex flex-col overflow-hidden">
          {/* Filters */}
          <div className="px-3 py-3 border-b border-border space-y-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search articles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-8 py-2 text-[12px]"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input-field text-[12px] py-1.5 flex-1"
              >
                <option value="all">All statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="input-field text-[12px] py-1.5 flex-1"
              >
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={`cat-filter-${c.replace(/\s+/g, '-')}`} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Article List */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                <BookOpen size={24} className="text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No articles match your filters</p>
              </div>
            ) : (
              filtered.map((article) => (
                <button
                  key={article.id}
                  onClick={() => setSelectedId(article.id)}
                  className={`w-full text-left px-3 py-3 border-b border-border/50 hover:bg-secondary/60 transition-colors ${
                    selectedId === article.id ? 'bg-blue-50 border-l-2 border-l-primary' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-[13px] font-600 text-foreground leading-snug">{article.title}</p>
                    <span className={`status-badge text-[10px] flex-shrink-0 ${statusClasses[article.status]}`}>
                      {article.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Tag size={9} />
                      {article.category}
                    </span>
                    {article.aiUsageCount > 0 && (
                      <span className="text-[11px] text-ai flex items-center gap-1">
                        <Bot size={9} />
                        {article.aiUsageCount.toLocaleString()} uses
                      </span>
                    )}
                    {article.deflectionScore > 0 && (
                      <span className={`text-[11px] font-600 ${article.deflectionScore >= 85 ? 'text-success' : article.deflectionScore >= 70 ? 'text-warning' : 'text-danger'}`}>
                        {article.deflectionScore}% eff.
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-1.5">
                    {article.languages.map((lang) => (
                      <span
                        key={`list-lang-${article.id}-${lang}`}
                        className={`status-badge text-[9px] ${langFlagClasses[lang as ArticleLanguage] || 'language-badge-en'}`}
                      >
                        {langLabels[lang as ArticleLanguage] || lang.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Article Editor Panel */}
        {selected ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Editor Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <h2 className="text-[15px] font-700 text-foreground truncate">{selected.title}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`status-badge text-[10px] ${statusClasses[selected.status]}`}>
                      {selected.status}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{selected.category}</span>
                    <span className="text-[11px] text-muted-foreground">·</span>
                    <span className="text-[11px] text-muted-foreground">Updated {selected.lastUpdated}</span>
                    <span className="text-[11px] text-muted-foreground">by {selected.author}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {selected.status === 'draft' && (
                  <button onClick={handlePublish} className="btn-primary text-[12px] py-1.5 px-3 flex items-center gap-1.5">
                    <Globe size={12} />
                    Publish
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-secondary text-[12px] py-1.5 px-3 flex items-center gap-1.5"
                >
                  {saving ? (
                    <>
                      <span className="w-3 h-3 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={12} />
                      Save Draft
                    </>
                  )}
                </button>
                <button
                  onClick={() => setDeleteModalOpen(true)}
                  className="btn-ghost p-1.5 hover:text-danger"
                  aria-label="Delete article"
                  title="Delete this article — this cannot be undone"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* AI Metrics Bar */}
            {selected.aiUsageCount > 0 && (
              <div className="flex items-center gap-6 px-5 py-2.5 bg-ai/5 border-b border-ai/10 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Bot size={13} className="text-ai" />
                  <span className="text-[12px] text-ai font-600">
                    AI cited this article {selected.aiUsageCount.toLocaleString()} times this month
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart2 size={13} className="text-ai" />
                  <span className="text-[12px] text-muted-foreground">
                    Deflection effectiveness:{' '}
                    <span className={`font-700 ${selected.deflectionScore >= 85 ? 'text-success' : selected.deflectionScore >= 70 ? 'text-warning' : 'text-danger'}`}>
                      {selected.deflectionScore}%
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye size={13} className="text-muted-foreground" />
                  <span className="text-[12px] text-muted-foreground">
                    {selected.views.toLocaleString()} customer views
                  </span>
                </div>
              </div>
            )}

            {/* Language Tabs */}
            <div className="flex items-center gap-1 px-5 py-2 border-b border-border bg-secondary/30 flex-shrink-0 overflow-x-auto scrollbar-thin">
              <Globe size={13} className="text-muted-foreground mr-1 flex-shrink-0" />
              {languages.map((lang) => {
                const hasVariant = selected.languages.includes(lang);
                return (
                  <button
                    key={`editor-lang-${lang}`}
                    onClick={() => setActiveLanguage(lang)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[12px] font-600 whitespace-nowrap transition-colors ${
                      activeLanguage === lang
                        ? 'bg-primary text-primary-foreground'
                        : hasVariant
                        ? 'bg-card text-foreground border border-border hover:bg-secondary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {languageNames[lang]}
                    {hasVariant && activeLanguage !== lang && (
                      <Check size={10} className="text-success" />
                    )}
                    {!hasVariant && (
                      <Plus size={10} className="text-muted-foreground" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Editor Body */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-5">
              {!selected.languages.includes(activeLanguage) && (
                <div className="mb-4 p-3 bg-warning/5 border border-warning/20 rounded-lg flex items-center gap-2">
                  <AlertCircle size={14} className="text-warning flex-shrink-0" />
                  <p className="text-[12px] text-warning">
                    No {languageNames[activeLanguage]} variant yet. Click &ldquo;Add Translation&rdquo; to auto-translate from English using AI.
                  </p>
                  <button
                    onClick={() => handleAddTranslation(activeLanguage)}
                    disabled={translationLoading}
                    className="btn-secondary text-[11px] py-1 px-2.5 ml-auto flex-shrink-0 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {translationLoading && translatingLang === activeLanguage ? (
                      <>
                        <Loader2 size={10} className="animate-spin" />
                        Translating...
                      </>
                    ) : (
                      'Add Translation'
                    )}
                  </button>
                </div>
              )}

              <div className="mb-4">
                <label htmlFor="article-title" className="block text-[12px] font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Article Title
                </label>
                <input
                  id="article-title"
                  type="text"
                  defaultValue={selected.title}
                  className="input-field text-[16px] font-700"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="article-category" className="block text-[12px] font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Category
                </label>
                <select
                  id="article-category"
                  defaultValue={selected.category}
                  className="input-field"
                >
                  {categories.map((c) => (
                    <option key={`editor-cat-${c.replace(/\s+/g, '-')}`} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="article-content" className="block text-[12px] font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Content (Markdown supported)
                </label>
                <p className="text-[11px] text-muted-foreground mb-2">
                  This content is indexed by the AI deflection engine. Clear, structured answers improve deflection accuracy.
                </p>
                <textarea
                  id="article-content"
                  value={editorContent}
                  onChange={(e) => setEditorContent(e.target.value)}
                  className="input-field font-mono text-[13px] leading-relaxed min-h-[320px] resize-y"
                />
              </div>

              <div className="mt-4 p-3 bg-secondary rounded-lg">
                <p className="text-[12px] font-600 text-foreground mb-2">AI Indexing Tips</p>
                <ul className="space-y-1">
                  {[
                    'Start with a clear, direct answer in the first paragraph',
                    'Use numbered steps for processes — AI extracts them better',
                    'Include exact values (timeframes, costs, limits) — reduces follow-up questions',
                    'Add variations of how customers might phrase the question',
                  ].map((tip, i) => (
                    <li key={`tip-${i + 1}`} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                      <Check size={10} className="text-success mt-0.5 flex-shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <BookOpen size={32} className="text-muted-foreground mx-auto mb-3" />
              <p className="text-[14px] font-600 text-foreground">Select an article to edit</p>
              <p className="text-[13px] text-muted-foreground mt-1">
                Or create a new article to expand your knowledge base
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirm Modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Article"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setDeleteModalOpen(false)}>Cancel</button>
            <button
              className="btn-primary bg-danger hover:bg-red-700"
              onClick={handleDelete}
            >
              Delete Article
            </button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[14px] text-foreground mb-1">
              Delete <strong>&ldquo;{selected?.title}&rdquo;</strong>?
            </p>
            <p className="text-[13px] text-muted-foreground">
              This article will be removed from the AI deflection index immediately. This cannot be undone.
            </p>
          </div>
        </div>
      </Modal>

      {/* New Article Modal */}
      <Modal
        open={newArticleModalOpen}
        onClose={() => setNewArticleModalOpen(false)}
        title="Create New Article"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setNewArticleModalOpen(false)}>Cancel</button>
            <button
              className="btn-primary"
              onClick={async () => {
                const titleEl = document.getElementById('new-title') as HTMLInputElement;
                const categoryEl = document.getElementById('new-category') as HTMLSelectElement;
                const langEl = document.getElementById('new-lang') as HTMLSelectElement;
                if (!titleEl?.value) return;
                const { error } = await supabase.from('kb_articles').insert({
                  title: titleEl.value,
                  category: categoryEl?.value || 'Order Tracking',
                  status: 'draft',
                  languages: [langEl?.value || 'en'],
                  content: '',
                  author_name: 'You',
                });
                setNewArticleModalOpen(false);
                if (error) {
                  toast.error('Failed to create article');
                } else {
                  toast.success('New article created as Draft');
                  fetchArticles();
                }
              }}
            >
              Create Article
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="new-title" className="block text-[13px] font-600 text-foreground mb-1.5">
              Article Title
            </label>
            <input
              id="new-title"
              type="text"
              placeholder="e.g. How to request an exchange"
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="new-category" className="block text-[13px] font-600 text-foreground mb-1.5">
              Category
            </label>
            <select id="new-category" className="input-field">
              {categories.map((c) => (
                <option key={`new-cat-${c.replace(/\s+/g, '-')}`} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="new-lang" className="block text-[13px] font-600 text-foreground mb-1.5">
              Primary Language
            </label>
            <select id="new-lang" className="input-field">
              <option value="en">English</option>
              <option value="id">Bahasa Indonesia</option>
              <option value="hi">Hindi</option>
              <option value="th">Thai</option>
              <option value="vi">Vietnamese</option>
              <option value="ta">Tamil</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}

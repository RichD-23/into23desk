'use client';

import React, { useState } from 'react';
import { Search, Filter, MapPin, ShoppingBag, MessageSquare, Phone, Star, Tag, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import AppLayout from '@/components/AppLayout';

const LANG_LABELS: Record<string, string> = {
  en: 'EN', id: 'ID', th: 'TH', vi: 'VI', ta: 'TA', hi: 'HI', bn: 'BN',
};

const LANG_BADGE: Record<string, string> = {
  en: 'language-badge-en', id: 'language-badge-id', th: 'language-badge-th',
  vi: 'language-badge-vi', ta: 'language-badge-ta', hi: 'language-badge-hi', bn: 'language-badge-bn',
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  React.useEffect(() => {
    const supabase = createClient();
    supabase
      .from('contacts')
      .select('*')
      .order('total_conversations', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error);
        setContacts(data || []);
        setLoading(false);
      });
  }, []);

  const filtered = contacts.filter((c) =>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.location?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-[18px] font-800 text-foreground">Contacts</h1>
              <p className="text-[12px] text-muted-foreground">
                {contacts.length} customers across Southeast Asia & India
              </p>
            </div>
          </div>
          <div className="relative max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, phone, location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-8 py-2 text-[13px]"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="flex items-center justify-center h-32 gap-2 text-muted-foreground text-sm">
              <Loader2 size={14} className="animate-spin" /> Loading contacts…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground">
              <Search size={24} className="mb-2" />
              <p className="text-sm">No contacts found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((c) => (
                <div key={c.id} className="px-6 py-3 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center text-[14px] font-700 text-foreground flex-shrink-0">
                      {c.name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-600 text-foreground truncate">{c.name}</span>
                        <span className={`status-badge text-[10px] ${LANG_BADGE[c.language] || 'language-badge-en'}`}>
                          {LANG_LABELS[c.language] || c.language}
                        </span>
                        {c.avg_csat > 0 && (
                          <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                            <Star size={10} className="text-warning fill-warning" /> {c.avg_csat}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1 font-mono">
                          <Phone size={9} /> {c.phone}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin size={9} /> {c.location}
                        </span>
                        {c.platform && (
                          <span className="flex items-center gap-1">
                            <ShoppingBag size={9} /> {c.platform}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <MessageSquare size={9} /> {c.total_conversations} conv
                        </span>
                      </div>
                      {c.tags && c.tags.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          {c.tags.map((t: string) => (
                            <span key={t} className="status-badge text-[9px] bg-secondary text-secondary-foreground">
                              <Tag size={8} className="mr-0.5" /> {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

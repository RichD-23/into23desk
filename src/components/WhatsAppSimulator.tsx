'use client';

/**
 * WhatsAppSimulator — the demo's invisible stagehand.
 *
 * In production this is replaced by the real WhatsApp Cloud API webhook.
 * For the June 10 demo to HM, this panel lets the presenter inject realistic
 * customer messages in any of 5+ languages, on cue, so the audience can see
 * the multilingual AI in action.
 *
 * Usage: a small floating button in the InboxLayout opens this panel.
 * Pick a contact (pre-loaded from the DB), type a message, hit Send. The
 * message is inserted into the messages table with direction='in', the AI
 * auto-detects language and translates to English. Realtime picks it up
 * and the agent sees it appear in the inbox.
 */

import React, { useEffect, useState } from 'react';
import { X, Send, Wand2, Loader2, Trash2, Sparkles, Globe } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface Contact {
  id: string;
  name: string;
  phone: string;
  language: string;
  location: string;
}

interface PresetMessage {
  label: string;
  content: string;
  language: string;
}

const PRESET_MESSAGES: PresetMessage[] = [
  { label: 'Order tracking (ID)', language: 'id', content: 'Halo, pesanan SH-8821 saya sudah 5 hari belum sampai. Bisa dicek?' },
  { label: 'Return request (TH)', language: 'th', content: 'สอบถามเรื่องการคืนสินค้าครับ สินค้าชำรุด' },
  { label: 'Cancel order (VI)', language: 'vi', content: 'Tôi muốn hủy đơn hàng #VN-9920, có thể được không?' },
  { label: 'Order status (TA)', language: 'ta', content: 'என் ஆர்டர் எங்கே உள்ளது? 3 நாட்கள் ஆகிவிட்டது' },
  { label: 'Cancel order (HI)', language: 'hi', content: 'मुझे अपना ऑर्डर कैंसिल करना है' },
  { label: 'Subscription issue (EN)', language: 'en', content: 'I was charged twice this month for my subscription. Can you check?' },
];

const LANG_LABELS: Record<string, string> = {
  en: 'EN',
  id: 'ID',
  th: 'TH',
  vi: 'VI',
  ta: 'TA',
  hi: 'HI',
  bn: 'BN',
  ms: 'MS',
  tl: 'TL',
};

interface WhatsAppSimulatorProps {
  open: boolean;
  onClose: () => void;
}

export default function WhatsAppSimulator({ open, onClose }: WhatsAppSimulatorProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<Array<{ id: string; contact: string; content: string; lang: string; translated?: string }>>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    if (!open) return;
    setLoadingContacts(true);
    supabase
      .from('contacts')
      .select('id, name, phone, language, location')
      .order('name')
      .then(({ data, error }) => {
        if (error) {
          toast.error('Failed to load contacts: ' + error.message);
        } else {
          setContacts(data || []);
          if (data && data.length > 0 && !selectedContactId) {
            setSelectedContactId(data[0].id);
            setLanguage(data[0].language || 'en');
          }
        }
        setLoadingContacts(false);
      });
  }, [open]);

  const sendMessage = async (opts: { withTranslation?: boolean; preset?: PresetMessage } = {}) => {
    const messageContent = opts.preset?.content ?? content;
    const messageLang = opts.preset?.language ?? language;

    if (!selectedContactId) {
      toast.error('Pick a contact first');
      return;
    }
    if (!messageContent.trim()) {
      toast.error('Type a message first');
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/messages/simulate-inbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: selectedContactId,
          content: messageContent,
          language: messageLang,
          withAiTranslation: opts.withTranslation !== false,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const contact = contacts.find((c) => c.id === selectedContactId);
      setHistory((prev) =>
        [
          {
            id: data.message.id,
            contact: contact?.name || 'Unknown',
            content: messageContent,
            lang: data.detected_language,
            translated: data.translated,
          },
          ...prev,
        ].slice(0, 6)
      );

      toast.success(
        `Sent as ${contact?.name} (${LANG_LABELS[data.detected_language] || data.detected_language})${
          data.translated ? ' — translated to English' : ''
        }`
      );

      if (!opts.preset) {
        setContent('');
      }
    } catch (err: any) {
      toast.error('Send failed: ' + (err.message || 'Unknown error'));
    } finally {
      setSending(false);
    }
  };

  const sendSeries = async () => {
    // Quick 3-message "customer typing" demo for the audience.
    const series = [
      { delay: 0, content: 'Halo, saya mau tanya soal pesanan saya', language: 'id' },
      { delay: 1200, content: 'Pesanan SH-8821 sudah 5 hari belum sampai', language: 'id' },
      { delay: 2400, content: 'Tolong dicek ya, sangat urgent', language: 'id' },
    ];
    for (const msg of series) {
      if (msg.delay) await new Promise((r) => setTimeout(r, msg.delay));
      const res = await fetch('/api/messages/simulate-inbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: selectedContactId,
          content: msg.content,
          language: msg.language,
          withAiTranslation: true,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const contact = contacts.find((c) => c.id === selectedContactId);
        setHistory((prev) =>
          [
            {
              id: data.message.id,
              contact: contact?.name || 'Unknown',
              content: msg.content,
              lang: data.detected_language,
              translated: data.translated,
            },
            ...prev,
          ].slice(0, 6)
        );
      }
    }
    toast.success('Sent 3-message demo series');
  };

  if (!open) return null;

  return (
    <div className="fixed top-4 right-4 z-50 w-[420px] max-w-[calc(100vw-2rem)] bg-card border border-border rounded-2xl shadow-modal overflow-hidden scale-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border gradient-brand text-white">
        <div className="flex items-center gap-2">
          <Wand2 size={16} />
          <div>
            <p className="text-[13px] font-700">Demo Simulator</p>
            <p className="text-[10px] text-white/70">Inject WhatsApp customer messages</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-white/10 transition-colors"
          aria-label="Close simulator"
        >
          <X size={15} />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3 max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-thin">
        <div>
          <label className="block text-[11px] font-600 text-muted-foreground mb-1">
            Customer (contact)
          </label>
          {loadingContacts ? (
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground py-2">
              <Loader2 size={12} className="animate-spin" /> Loading contacts…
            </div>
          ) : (
            <select
              value={selectedContactId}
              onChange={(e) => {
                setSelectedContactId(e.target.value);
                const c = contacts.find((c) => c.id === e.target.value);
                if (c) setLanguage(c.language);
              }}
              className="input-field text-[13px]"
            >
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · +{c.phone} · {LANG_LABELS[c.language] || c.language}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-[11px] font-600 text-muted-foreground mb-1">
            Message
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type a customer message in any language…"
            className="input-field min-h-[80px] text-[13px] resize-y"
          />
        </div>

        <div className="flex items-center gap-2">
          <Globe size={12} className="text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground">Language</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="text-[11px] py-1 px-2 rounded border border-border bg-secondary"
          >
            <option value="">Auto-detect</option>
            <option value="en">English</option>
            <option value="id">Bahasa Indonesia</option>
            <option value="th">Thai</option>
            <option value="vi">Vietnamese</option>
            <option value="ta">Tamil</option>
            <option value="hi">Hindi</option>
            <option value="bn">Bengali</option>
          </select>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => sendMessage()}
            disabled={sending || !content.trim()}
            className="btn-primary text-[12px] py-1.5 flex-1"
          >
            {sending ? (
              <span className="flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" />
                Sending…
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Send size={12} />
                Send to inbox
              </span>
            )}
          </button>
          <button
            onClick={sendSeries}
            disabled={sending || !selectedContactId}
            className="btn-secondary text-[12px] py-1.5"
            title="Send a 3-message demo series (3s)"
          >
            <Sparkles size={12} />
            Series
          </button>
        </div>

        <div className="pt-2 border-t border-border">
          <p className="text-[11px] font-600 text-muted-foreground mb-1.5 flex items-center gap-1">
            <Wand2 size={10} />
            One-tap presets
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {PRESET_MESSAGES.map((p) => (
              <button
                key={p.label}
                onClick={() => sendMessage({ preset: p })}
                disabled={sending}
                className="text-left text-[10.5px] px-2 py-1.5 bg-secondary hover:bg-border rounded text-foreground transition-colors disabled:opacity-50"
              >
                <span className="font-600">{LANG_LABELS[p.language]}</span> · {p.label.split('(')[0].trim()}
              </button>
            ))}
          </div>
        </div>

        {history.length > 0 && (
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-600 text-muted-foreground">Recent (last 6)</p>
              <button
                onClick={() => setHistory([])}
                className="text-[10px] text-muted-foreground hover:text-danger flex items-center gap-1"
              >
                <Trash2 size={9} /> Clear
              </button>
            </div>
            <div className="space-y-1.5">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="bg-secondary/50 rounded px-2 py-1.5 text-[10.5px]"
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-600 text-foreground">{h.contact}</span>
                    <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary font-600">
                      {LANG_LABELS[h.lang] || h.lang}
                    </span>
                  </div>
                  <p className="text-foreground/80">{h.content}</p>
                  {h.translated && (
                    <p className="text-muted-foreground italic mt-0.5 text-[10px]">
                      → {h.translated}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground/70 pt-2">
          Demo only. In production this panel is replaced by the real WhatsApp Cloud API webhook
          receiving messages from Meta.
        </p>
      </div>
    </div>
  );
}

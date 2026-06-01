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
 * Pick a contact (pre-loaded from the DB), pick a persona, hit Send. The
 * message is inserted into the messages table with direction='in', the AI
 * auto-detects language and translates to English. Realtime picks it up
 * and the agent sees it appear in the inbox.
 */

import React, { useEffect, useState } from 'react';
import {
  X, Send, Wand2, Loader2, Trash2, Sparkles, Globe, RotateCcw, UserCircle2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface Contact {
  id: string;
  name: string;
  phone: string;
  language: string;
  location: string;
}

type Persona =
  | 'polite-asker'
  | 'frustrated-returner'
  | 'first-timer'
  | 'urgent'
  | 'chatter';

interface PresetMessage {
  id: string;
  label: string;
  persona: Persona;
  language: string;
  content: string;
  emoji: string;
}

const PRESET_MESSAGES: PresetMessage[] = [
  // Indonesian (Bahasa)
  { id: 'p1', label: 'Polite asker',   persona: 'polite-asker',   language: 'id', content: 'Halo kak, mau tanya dong, pesanan SH-8821 saya sudah 5 hari belum sampai. Normalnya berapa lama ya?', emoji: '🙏' },
  { id: 'p2', label: 'Frustrated',     persona: 'frustrated-returner', language: 'id', content: 'Ini kenapa barang saya rusak?? Saya mau return dong, sudah difoto semua. Tolong segera diproses ya!', emoji: '😡' },
  { id: 'p3', label: 'First-timer',    persona: 'first-timer',    language: 'id', content: 'Halo, saya baru pertama kali belanja di sini. Gimana cara cek ongkir ke Makassar?', emoji: '👋' },
  // Thai
  { id: 'p4', label: 'Polite asker',   persona: 'polite-asker',   language: 'th', content: 'สวัสดีครับ อยากสอบถามเรื่องการคืนสินค้าค่ะ ต้องทำยังไงบ้างคะ?', emoji: '🙏' },
  { id: 'p5', label: 'Urgent',         persona: 'urgent',         language: 'th', content: 'ด่วนมากค่ะ! พัสดุหาย ลูกค้ารอนานแล้ว ช่วยติดตามด่วนนะคะ', emoji: '🚨' },
  // Vietnamese
  { id: 'p6', label: 'Polite asker',   persona: 'polite-asker',   language: 'vi', content: 'Chào shop, đơn hàng #VN-9920 của mình bị hủy rồi à? Mình chưa nhận được hàng, mà sao lại báo hủy vậy?', emoji: '🙏' },
  { id: 'p7', label: 'Frustrated',     persona: 'frustrated-returner', language: 'vi', content: 'Áo dài bị rách khi nhận hàng. Mình gửi hình rồi nè. Yêu cầu hoàn tiền 100%!', emoji: '😡' },
  // Tamil
  { id: 'p8', label: 'Polite asker',   persona: 'polite-asker',   language: 'ta', content: 'வணக்கம், என் ஆர்டர் எங்கே உள்ளது? 3 நாட்கள் ஆகிவிட்டது, இன்னும் வரவில்லை.', emoji: '🙏' },
  { id: 'p9', label: 'Chatter',        persona: 'chatter',        language: 'ta', content: 'நான் silk saree வாங்கினேன், அது beautiful! ஆனா ஒரு question — return policy என்ன?', emoji: '✨' },
  // Hindi
  { id: 'p10', label: 'Polite asker',  persona: 'polite-asker',    language: 'hi', content: 'नमस्ते, मुझे अपना ऑर्डर कैंसिल करना है। क्या हो सकता है?', emoji: '🙏' },
  { id: 'p11', label: 'Urgent',        persona: 'urgent',         language: 'hi', content: 'मेरा ऑर्डर गलत address पर चला गया है! कृपया तुरंत ठीक करें, मुझे आज ही चाहिए!', emoji: '🚨' },
  // English
  { id: 'p12', label: 'Chatter',       persona: 'chatter',        language: 'en', content: "Hey! I was charged twice this month for my subscription. Can you take a look?", emoji: '💳' },
];

const LANG_LABELS: Record<string, string> = {
  en: 'EN', id: 'ID', th: 'TH', vi: 'VI', ta: 'TA', hi: 'HI', bn: 'BN',
  ms: 'MS', tl: 'TL',
};

const PERSONA_COLORS: Record<Persona, string> = {
  'polite-asker':       'bg-blue-100 text-blue-700',
  'frustrated-returner':'bg-red-100 text-red-700',
  'first-timer':        'bg-green-100 text-green-700',
  'urgent':             'bg-orange-100 text-orange-700',
  'chatter':            'bg-purple-100 text-purple-700',
};

const PERSONA_LABELS: Record<Persona, string> = {
  'polite-asker':        'Polite',
  'frustrated-returner': 'Frustrated',
  'first-timer':         'First-timer',
  'urgent':              'Urgent',
  'chatter':             'Chatter',
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
  const [history, setHistory] = useState<Array<{ id: string; contact: string; content: string; lang: string; translated?: string; emoji?: string }>>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [resetting, setResetting] = useState(false);

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

  const sendMessage = async (opts: { preset?: PresetMessage } = {}) => {
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
          withAiTranslation: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      const contact = contacts.find((c) => c.id === selectedContactId);
      setHistory((prev) =>
        [
          {
            id: data.message.id,
            contact: contact?.name || 'Unknown',
            content: messageContent,
            lang: data.detected_language,
            translated: data.translated,
            emoji: opts.preset?.emoji,
          },
          ...prev,
        ].slice(0, 8)
      );

      toast.success(
        `Sent as ${contact?.name} (${LANG_LABELS[data.detected_language] || data.detected_language})`
      );

      if (!opts.preset) setContent('');
    } catch (err: any) {
      toast.error('Send failed: ' + (err.message || 'Unknown error'));
    } finally {
      setSending(false);
    }
  };

  const sendSeries = async () => {
    if (!selectedContactId) {
      toast.error('Pick a contact first');
      return;
    }
    const series = [
      { delay: 0,    content: 'Halo, saya mau tanya soal pesanan saya', language: 'id' },
      { delay: 1500, content: 'Pesanan SH-8821 sudah 5 hari belum sampai', language: 'id' },
      { delay: 3000, content: 'Tolong dicek ya, sangat urgent 🙏', language: 'id' },
    ];
    for (const msg of series) {
      if (msg.delay) await new Promise((r) => setTimeout(r, msg.delay));
      await fetch('/api/messages/simulate-inbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: selectedContactId,
          content: msg.content,
          language: msg.language,
          withAiTranslation: true,
        }),
      });
    }
    toast.success('Sent 3-message series — watch the inbox');
  };

  const resetDemo = async () => {
    if (!confirm('Reset demo data? This deletes all simulated messages and resets conversations to seed state.')) return;
    setResetting(true);
    try {
      const res = await fetch('/api/admin/reset-demo', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success(`Reset: ${data.deleted_messages || 0} messages removed, conversations restored`);
      setHistory([]);
    } catch (err: any) {
      toast.error('Reset failed: ' + (err.message || 'Unknown error'));
    } finally {
      setResetting(false);
    }
  };

  // Group presets by language
  const presetsByLang = PRESET_MESSAGES.reduce<Record<string, PresetMessage[]>>((acc, p) => {
    if (!acc[p.language]) acc[p.language] = [];
    acc[p.language].push(p);
    return acc;
  }, {});

  if (!open) return null;

  return (
    <div className="fixed top-4 right-4 z-50 w-[440px] max-w-[calc(100vw-2rem)] bg-card border border-border rounded-2xl shadow-modal overflow-hidden scale-in">
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
            Custom message
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Or type your own — any language, any tone…"
            className="input-field min-h-[72px] text-[13px] resize-y"
          />
          <div className="flex items-center gap-2 mt-1.5">
            <Globe size={11} className="text-muted-foreground" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="text-[10.5px] py-0.5 px-1.5 rounded border border-border bg-secondary"
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
        </div>

        <div className="flex items-center gap-2">
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
            title="3-message demo (3s) — customer typing effect"
          >
            <Sparkles size={12} />
            Series
          </button>
          <button
            onClick={resetDemo}
            disabled={resetting}
            className="btn-ghost text-[12px] py-1.5 px-2"
            title="Clear simulated messages & restore seed state"
          >
            <RotateCcw size={12} className={resetting ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Persona presets, grouped by language */}
        <div className="pt-2 border-t border-border">
          <p className="text-[11px] font-600 text-muted-foreground mb-1.5 flex items-center gap-1">
            <Wand2 size={10} />
            Persona presets ({PRESET_MESSAGES.length})
          </p>
          <div className="space-y-2">
            {Object.entries(presetsByLang).map(([lang, presets]) => (
              <div key={lang}>
                <p className="text-[10px] font-600 text-muted-foreground mb-1">
                  {LANG_LABELS[lang] || lang} · {presets[0] ? '' : ''}
                </p>
                <div className="grid grid-cols-1 gap-1">
                  {presets.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => sendMessage({ preset: p })}
                      disabled={sending}
                      className="text-left text-[10.5px] px-2 py-1.5 bg-secondary hover:bg-border rounded text-foreground transition-colors disabled:opacity-50 flex items-start gap-1.5"
                    >
                      <span className="text-[12px] flex-shrink-0">{p.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[8.5px] px-1 rounded font-600 ${PERSONA_COLORS[p.persona]}`}>
                            {PERSONA_LABELS[p.persona]}
                          </span>
                          <span className="text-muted-foreground truncate">
                            {p.content.slice(0, 50)}{p.content.length > 50 ? '…' : ''}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {history.length > 0 && (
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-600 text-muted-foreground">Recent (last 8)</p>
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
                    <UserCircle2 size={11} className="text-muted-foreground" />
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

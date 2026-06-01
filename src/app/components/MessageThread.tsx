'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Check, CheckCheck, Paperclip, Smile, Send, Bot, StickyNote, PanelRightOpen, PanelRightClose, ArrowUpRight, UserCheck, CheckCircle, X, FileText, Languages, RefreshCw, BookOpen } from 'lucide-react';
import AppImage from '@/components/ui/AppImage';
import { type Conversation, type Message, agents } from './inboxData';
import { toast } from 'sonner';
import { useChat } from '@/lib/hooks/useChat';

interface MessageThreadProps {
  conversation: Conversation;
  contextOpen: boolean;
  onToggleContext: () => void;
}

export default function MessageThread({
  conversation,
  contextOpen,
  onToggleContext,
}: MessageThreadProps) {
  const [replyText, setReplyText] = useState('');
  const [isNote, setIsNote] = useState(false);
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [assignedAgent, setAssignedAgent] = useState(conversation.assignedAgent || '');
  const [showAiSuggestion, setShowAiSuggestion] = useState(conversation.aiSuggestion ?? false);
  const [sending, setSending] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [kbArticlesUsed, setKbArticlesUsed] = useState<{ id: string; title: string; category: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Perplexity hook for translation only
  const {
    response: translationResponse,
    isLoading: translationLoading,
    error: translationError,
    sendMessage: sendTranslation,
  } = useChat('PERPLEXITY', 'perplexity/sonar-pro', false);

  const [aiSuggestions, setAiSuggestions] = useState<string[]>([
    'Your order SH-8821 is currently in transit at the JNE Bekasi sorting hub. Expected delivery within 1–2 business days.',
    'I apologize for the delay. We\'ve filed a priority claim with JNE. You\'ll receive an SMS update within 2 hours.',
  ]);
  const [suggestionsLoaded, setSuggestionsLoaded] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.id]);

  // Reset suggestions when conversation changes
  useEffect(() => {
    setSuggestionsLoaded(false);
    setShowAiSuggestion(conversation.aiSuggestion ?? false);
    setKbArticlesUsed([]);
  }, [conversation.id, conversation.aiSuggestion]);

  // Handle translation errors
  useEffect(() => {
    if (translationError) {
      toast.error('Translation failed: ' + translationError.message);
      setTranslating(false);
    }
  }, [translationError]);

  // Apply translation result to reply box
  useEffect(() => {
    if (translationResponse && !translationLoading && translating) {
      setReplyText(translationResponse.trim());
      setTranslating(false);
      toast.success('Message translated');
    }
  }, [translationResponse, translationLoading, translating]);

  const langNames: Record<string, string> = {
    id: 'Bahasa Indonesia',
    th: 'Thai',
    vi: 'Vietnamese',
    ta: 'Tamil',
    hi: 'Hindi',
    en: 'English',
  };

  const handleFetchAiSuggestion = async () => {
    const lastCustomerMessages = conversation.messages
      .filter((m) => m.direction === 'in')
      .slice(-3)
      .map((m) => m.content);

    if (lastCustomerMessages.length === 0) {
      toast.error('No customer messages found to generate suggestions');
      return;
    }

    setSuggestionLoading(true);
    setSuggestionsLoaded(false);
    setKbArticlesUsed([]);
    setShowAiSuggestion(true);

    try {
      const res = await fetch('/api/ai/kb-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerMessages: lastCustomerMessages,
          conversationLanguage: conversation.language,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();

      if (data.suggestions && data.suggestions.length > 0) {
        setAiSuggestions(data.suggestions);
        setSuggestionsLoaded(true);
        if (data.kbArticlesUsed && data.kbArticlesUsed.length > 0) {
          setKbArticlesUsed(data.kbArticlesUsed);
          toast.success(`AI reply grounded in ${data.kbArticlesUsed.length} KB article${data.kbArticlesUsed.length > 1 ? 's' : ''}`);
        } else {
          toast.success('AI reply generated (no matching KB articles found)');
        }
      } else {
        throw new Error('No suggestions returned');
      }
    } catch (err: any) {
      toast.error('AI suggestion failed: ' + (err.message || 'Unknown error'));
      setShowAiSuggestion(false);
    } finally {
      setSuggestionLoading(false);
    }
  };

  const handleTranslate = () => {
    if (!replyText.trim()) {
      toast.error('Please type a message to translate');
      return;
    }
    const targetLang = langNames[conversation.language] || 'English';
    setTranslating(true);
    sendTranslation([
      {
        role: 'system',
        content: `You are a professional translator. Translate the given text to ${targetLang}. Return ONLY the translated text, no explanations, no quotes.`,
      },
      {
        role: 'user',
        content: replyText,
      },
    ], { temperature: 0.2, max_tokens: 500 });
  };

  const handleSend = () => {
    if (!replyText.trim()) return;
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setReplyText('');
      toast.success(isNote ? 'Internal note added' : 'Message sent via WhatsApp');
    }, 800);
  };

  const handleResolve = () => {
    toast.success(`Conversation with ${conversation.contact.name} resolved`);
  };

  const handleEscalate = () => {
    toast.info('Conversation escalated to team lead');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Thread Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center text-[14px] font-700 text-foreground flex-shrink-0">
            {conversation.contact.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-700 text-foreground truncate">
                {conversation.contact.name}
              </h3>
              <span
                className={`status-badge text-[10px] ${
                  conversation.status === 'open' ? 'status-open'
                    : conversation.status === 'assigned' ? 'status-assigned'
                    : conversation.status === 'pending' ? 'status-pending' : 'status-resolved'
                }`}
              >
                {conversation.status}
              </span>
            </div>
            <p className="text-[12px] text-muted-foreground">
              {conversation.contact.phone} · {conversation.contact.platform}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Assign */}
          <div className="relative">
            <button
              onClick={() => setShowAssignDropdown(!showAssignDropdown)}
              className="btn-secondary text-[12px] py-1.5 px-3 flex items-center gap-1.5"
            >
              <UserCheck size={13} />
              {assignedAgent || 'Assign'}
            </button>
            {showAssignDropdown && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-card border border-border rounded-lg shadow-modal z-20 scale-in">
                <div className="p-1">
                  <p className="text-[10px] font-600 uppercase tracking-wide text-muted-foreground px-2 py-1">
                    Assign to agent
                  </p>
                  {agents.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => {
                        setAssignedAgent(agent.name);
                        setShowAssignDropdown(false);
                        toast.success(`Assigned to ${agent.name}`);
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-[13px] text-foreground hover:bg-secondary rounded"
                    >
                      <div
                        className={`w-5 h-5 rounded-full text-[9px] font-700 flex items-center justify-center ${agent.color}`}
                      >
                        {agent.initials}
                      </div>
                      {agent.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleEscalate}
            className="btn-ghost text-[12px] py-1.5 px-2.5"
            title="Escalate to team lead"
          >
            <ArrowUpRight size={14} />
          </button>

          <button
            onClick={handleResolve}
            className="btn-primary text-[12px] py-1.5 px-3 flex items-center gap-1.5"
          >
            <CheckCircle size={13} />
            Resolve
          </button>

          <button
            onClick={onToggleContext}
            className="btn-ghost p-1.5"
            aria-label={contextOpen ? 'Close context panel' : 'Open context panel'}
          >
            {contextOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
          </button>
        </div>
      </div>

      {/* AI Suggestion Banner */}
      {showAiSuggestion && (
        <div className="mx-4 mt-3 p-3 bg-ai-bg border border-ai/20 rounded-lg flex-shrink-0 fade-in">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 min-w-0 flex-1">
              <Bot size={15} className="text-ai flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[12px] font-600 text-ai">AI Suggestion</p>
                  {kbArticlesUsed.length > 0 && (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                      <BookOpen size={9} />
                      {kbArticlesUsed.length} KB article{kbArticlesUsed.length > 1 ? 's' : ''}
                    </span>
                  )}
                  <button
                    onClick={handleFetchAiSuggestion}
                    disabled={suggestionLoading}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-ai transition-colors"
                    title="Refresh AI suggestions from KB"
                  >
                    <RefreshCw size={10} className={suggestionLoading ? 'animate-spin' : ''} />
                    {suggestionLoading ? 'Searching KB...' : 'Refresh'}
                  </button>
                </div>
                {kbArticlesUsed.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {kbArticlesUsed.map((a) => (
                      <span key={a.id} className="text-[10px] text-ai/70 bg-ai/5 border border-ai/10 px-1.5 py-0.5 rounded truncate max-w-[160px]" title={a.title}>
                        {a.title}
                      </span>
                    ))}
                  </div>
                )}
                {suggestionLoading ? (
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-ai/30 border-t-ai rounded-full animate-spin" />
                    <p className="text-[12px] text-muted-foreground">Searching KB and drafting reply...</p>
                  </div>
                ) : (
                  <>
                    <p className="text-[12px] text-foreground leading-relaxed">
                      {aiSuggestions[0]}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => {
                          setReplyText(aiSuggestions[0]);
                          setIsNote(false);
                          setShowAiSuggestion(false);
                        }}
                        className="text-[11px] font-600 text-ai hover:underline"
                      >
                        Use this reply
                      </button>
                      {aiSuggestions[1] && (
                        <>
                          <span className="text-muted-foreground text-[10px]">·</span>
                          <button
                            onClick={() => {
                              setReplyText(aiSuggestions[1]);
                              setIsNote(false);
                              setShowAiSuggestion(false);
                            }}
                            className="text-[11px] text-muted-foreground hover:text-foreground"
                          >
                            Alternative
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowAiSuggestion(false)}
              className="btn-ghost p-1 flex-shrink-0"
              aria-label="Dismiss AI suggestion"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
        {/* Date separator */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[11px] text-muted-foreground px-2 font-500">Today, 10 May 2026</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {conversation.messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply Composer */}
      <div className="border-t border-border bg-card flex-shrink-0">
        {/* Toggle: Reply vs Note */}
        <div className="flex items-center px-4 pt-3 gap-2">
          <button
            onClick={() => setIsNote(false)}
            className={`flex items-center gap-1.5 text-[12px] font-600 px-3 py-1.5 rounded-md transition-colors ${
              !isNote
                ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Send size={12} />
            Reply to customer
          </button>
          <button
            onClick={() => setIsNote(true)}
            className={`flex items-center gap-1.5 text-[12px] font-600 px-3 py-1.5 rounded-md transition-colors ${
              isNote
                ? 'bg-warning/10 text-warning' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <StickyNote size={12} />
            Internal note
          </button>
        </div>

        {/* Textarea */}
        <div className={`m-3 rounded-lg border ${isNote ? 'border-warning/40 bg-warning/5' : 'border-border'}`}>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={
              isNote
                ? 'Add a private note for your team...'
                : `Reply to ${conversation.contact.name} in ${conversation.language === 'id' ? 'Bahasa Indonesia' : conversation.language === 'th' ? 'Thai' : conversation.language === 'vi' ? 'Vietnamese' : conversation.language === 'ta' ? 'Tamil' : conversation.language === 'hi' ? 'Hindi' : 'English'}...`
            }
            className="w-full p-3 bg-transparent text-[13px] text-foreground placeholder-muted-foreground resize-none outline-none min-h-[72px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSend();
              }
            }}
          />
          <div className="flex items-center justify-between px-3 pb-2.5">
            <div className="flex items-center gap-1">
              <button className="btn-ghost p-1.5" aria-label="Attach file">
                <Paperclip size={14} />
              </button>
              <button className="btn-ghost p-1.5" aria-label="Add emoji">
                <Smile size={14} />
              </button>
              <button
                onClick={handleTranslate}
                disabled={translationLoading || translating || !replyText.trim()}
                className="btn-ghost p-1.5 flex items-center gap-1 text-[11px] disabled:opacity-50"
                aria-label="Translate message"
                title={`Translate to ${langNames[conversation.language] || 'customer language'}`}
              >
                {translationLoading || translating ? (
                  <span className="w-3 h-3 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                ) : (
                  <Languages size={14} />
                )}
                <span>{translationLoading || translating ? 'Translating...' : 'Translate'}</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">⌘ + Enter to send</span>
              <button
                onClick={handleSend}
                disabled={!replyText.trim() || sending}
                className="btn-primary text-[12px] py-1.5 px-3"
              >
                {sending ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    {isNote ? <StickyNote size={12} /> : <Send size={12} />}
                    {isNote ? 'Add Note' : 'Send'}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeliveryIcon({ status }: { status?: string }) {
  if (status === 'read') return <CheckCheck size={12} className="whatsapp-tick" />;
  if (status === 'delivered') return <CheckCheck size={12} className="text-muted-foreground" />;
  return <Check size={12} className="text-muted-foreground" />;
}

function MessageBubble({ message }: { message: Message }) {
  const isIncoming = message.direction === 'in';
  const isNote = message.direction === 'note';

  if (isNote) {
    return (
      <div className="flex justify-center">
        <div className="note-stripe border border-warning/30 rounded-lg px-4 py-2.5 max-w-sm text-center">
          <div className="flex items-center gap-1.5 justify-center mb-1">
            <StickyNote size={11} className="text-warning" />
            <span className="text-[11px] font-600 text-warning">Internal Note · {message.authorName}</span>
          </div>
          <p className="text-[12px] text-foreground/80 leading-relaxed">{message.content}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{message.timestamp}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isIncoming ? 'justify-start' : 'justify-end'} message-hover`}>
      <div className={`max-w-[70%] ${isIncoming ? '' : 'items-end'} flex flex-col gap-0.5`}>
        {message.type === 'image' && message.mediaUrl && (
          <div className={`rounded-xl overflow-hidden ${isIncoming ? 'conversation-bubble-in' : 'conversation-bubble-out'}`}>
            <AppImage
              src={message.mediaUrl}
              alt={message.content}
              width={240}
              height={160}
              className="block"
            />
            {message.content && (
              <div className={`px-3 py-2 text-[13px] ${isIncoming ? 'bg-secondary text-foreground' : 'bg-primary text-primary-foreground'}`}>
                {message.content}
              </div>
            )}
          </div>
        )}

        {message.type === 'document' && (
          <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${isIncoming ? 'conversation-bubble-in bg-secondary' : 'conversation-bubble-out bg-primary text-primary-foreground'}`}>
            <div className={`w-8 h-8 rounded flex items-center justify-center ${isIncoming ? 'bg-border' : 'bg-white/20'}`}>
              <FileText size={16} className={isIncoming ? 'text-foreground' : 'text-white'} />
            </div>
            <div>
              <p className="text-[13px] font-500">{message.fileName}</p>
              <p className="text-[11px] opacity-70">{message.fileSize}</p>
            </div>
          </div>
        )}

        {message.type === 'text' && (
          <div
            className={`px-3 py-2 text-[13px] leading-relaxed ${
              isIncoming
                ? 'conversation-bubble-in bg-secondary text-foreground'
                : 'conversation-bubble-out bg-primary text-primary-foreground'
            }`}
          >
            {message.content}
          </div>
        )}

        {/* Translation */}
        {message.translated && isIncoming && (
          <div className="flex items-start gap-1 px-1">
            <Languages size={10} className="text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-muted-foreground italic">{message.translated}</p>
          </div>
        )}

        {/* Timestamp + delivery */}
        <div className={`flex items-center gap-1 px-1 ${isIncoming ? '' : 'flex-row-reverse'}`}>
          <span className="text-[10px] text-muted-foreground font-mono">{message.timestamp}</span>
          {!isIncoming && message.delivery && <DeliveryIcon status={message.delivery} />}
        </div>
      </div>
    </div>
  );
}
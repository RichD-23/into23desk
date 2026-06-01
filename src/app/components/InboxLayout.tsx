'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ConversationList from './ConversationList';
import MessageThread from './MessageThread';
import ContactContextPanel from './ContactContextPanel';
import { type Conversation } from './inboxData';
import { createClient } from '@/lib/supabase/client';

function mapDbConversation(row: any): Conversation {
  return {
    id: row.id,
    status: row.status,
    assignedAgent: row.user_profiles?.full_name || undefined,
    assignedAgentInitials: row.user_profiles?.initials || undefined,
    lastMessage: row.last_message || '',
    lastMessageTime: row.last_message_time
      ? formatRelativeTime(new Date(row.last_message_time))
      : '',
    unread: row.unread_count || 0,
    language: row.language || 'en',
    aiSuggestion: row.ai_suggestion || false,
    priority: row.priority || 'normal',
    waitingTime: row.waiting_time || undefined,
    contact: {
      id: row.contacts?.id || row.contact_id,
      name: row.contacts?.name || 'Unknown',
      phone: row.contacts?.phone || '',
      language: row.contacts?.language || 'en',
      email: row.contacts?.email || undefined,
      location: row.contacts?.location || '',
      platform: row.contacts?.platform || '',
      totalConversations: row.contacts?.total_conversations || 0,
      avgCsat: row.contacts?.avg_csat || 0,
      orders: [],
      tags: row.contacts?.tags || [],
    },
    messages: (row.messages || []).map((m: any) => ({
      id: m.id,
      type: m.message_type,
      direction: m.direction,
      content: m.content,
      timestamp: m.sent_at ? new Date(m.sent_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
      delivery: m.delivery || undefined,
      mediaUrl: m.media_url || undefined,
      fileName: m.file_name || undefined,
      fileSize: m.file_size || undefined,
      authorName: m.author_name || undefined,
      translated: m.translated || undefined,
    })),
  };
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export default function InboxLayout() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [contextOpen, setContextOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchConversations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          contacts(*),
          user_profiles(full_name, initials, color_class),
          messages(id, message_type, direction, content, delivery, media_url, file_name, file_size, author_name, translated, sent_at)
        `)
        .order('last_message_time', { ascending: false });

      if (error) {
        console.log('Conversations fetch error:', error.message);
        return;
      }

      const mapped = (data || []).map(mapDbConversation);
      setConversations(mapped);
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
    fetchConversations();

    // Real-time subscription for conversations
    const channel = supabase
      .channel('inbox_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        fetchConversations();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const selected = conversations.find((c) => c.id === selectedId) || conversations[0];

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Conversation List Panel */}
      <div className="w-[300px] xl:w-[320px] flex-shrink-0 border-r border-border flex flex-col overflow-hidden">
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>

      {/* Message Thread Panel */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {selected ? (
          <MessageThread
            conversation={selected}
            contextOpen={contextOpen}
            onToggleContext={() => setContextOpen(!contextOpen)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            Select a conversation to view messages
          </div>
        )}
      </div>

      {/* Contact Context Panel */}
      {contextOpen && selected && (
        <div className="w-[300px] xl:w-[320px] flex-shrink-0 border-l border-border flex flex-col overflow-hidden">
          <ContactContextPanel conversation={selected} />
        </div>
      )}
    </div>
  );
}
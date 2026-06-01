'use client';

import React, { useState } from 'react';
import { Search, Filter, Bot, Clock } from 'lucide-react';
import { type Conversation, languageLabels, languageFlagClasses } from './inboxData';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string;
  onSelect: (id: string) => void;
}

type FilterTab = 'all' | 'open' | 'assigned' | 'pending' | 'resolved';

const statusColors: Record<string, string> = {
  open: 'status-open',
  assigned: 'status-assigned',
  pending: 'status-pending',
  resolved: 'status-resolved',
};

const agentInitialColors: Record<string, string> = {
  PN: 'bg-purple-100 text-purple-700',
  AW: 'bg-blue-100 text-blue-700',
  TN: 'bg-green-100 text-green-700',
  KR: 'bg-orange-100 text-orange-700',
  MS: 'bg-pink-100 text-pink-700',
};

export default function ConversationList({
  conversations,
  selectedId,
  onSelect,
}: ConversationListProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const tabs: { id: FilterTab; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: conversations.length },
    { id: 'open', label: 'Open', count: conversations.filter((c) => c.status === 'open').length },
    { id: 'assigned', label: 'Mine', count: conversations.filter((c) => c.status === 'assigned').length },
    { id: 'pending', label: 'Pending', count: conversations.filter((c) => c.status === 'pending').length },
  ];

  const filtered = conversations.filter((c) => {
    const matchesSearch =
      !search ||
      c.contact.name.toLowerCase().includes(search.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === 'all' || c.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const unassignedCount = conversations.filter((c) => c.status === 'open').length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-700 text-foreground">Conversations</h2>
          <div className="flex items-center gap-1">
            {unassignedCount > 0 && (
              <span className="status-badge status-pending text-[10px]">
                {unassignedCount} unassigned
              </span>
            )}
            <button className="btn-ghost p-1.5" aria-label="Filter conversations">
              <Filter size={15} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-8 py-2 text-[13px]"
            aria-label="Search conversations"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-2.5 overflow-x-auto scrollbar-thin pb-0.5">
          {tabs.map((tab) => (
            <button
              key={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[12px] font-600 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              {tab.label}
              <span
                className={`text-[10px] px-1 rounded ${
                  activeTab === tab.id ? 'bg-white/20' : 'bg-muted'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Conversation Items */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <Search size={24} className="text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No conversations found</p>
          </div>
        ) : (
          filtered.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isSelected={selectedId === conv.id}
              onSelect={onSelect}
              agentInitialColors={agentInitialColors}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ConversationItem({
  conversation: conv,
  isSelected,
  onSelect,
  agentInitialColors,
}: {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: (id: string) => void;
  agentInitialColors: Record<string, string>;
}) {
  return (
    <button
      key={conv.id}
      onClick={() => onSelect(conv.id)}
      className={`w-full text-left px-3 py-3 border-b border-border/50 transition-colors hover:bg-secondary/60 ${
        isSelected ? 'bg-blue-50 border-l-2 border-l-primary' : ''
      }`}
    >
      <div className="flex items-start gap-2.5">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center text-[13px] font-700 text-foreground">
            {conv.contact.name.charAt(0)}
          </div>
          {conv.assignedAgentInitials && (
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-700 flex items-center justify-center border border-card ${
                agentInitialColors[conv.assignedAgentInitials] || 'bg-secondary text-foreground'
              }`}
            >
              {conv.assignedAgentInitials.charAt(0)}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Name + Time */}
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[13px] font-600 text-foreground truncate">
              {conv.contact.name}
            </span>
            <span className="text-[11px] text-muted-foreground flex-shrink-0 ml-1">
              {conv.lastMessageTime}
            </span>
          </div>

          {/* Last message */}
          <p className="text-[12px] text-muted-foreground truncate leading-snug">
            {conv.lastMessage}
          </p>

          {/* Badges row */}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span
              className={`status-badge text-[10px] ${
                languageFlagClasses[conv.language] || 'language-badge-en'
              }`}
            >
              {languageLabels[conv.language]}
            </span>

            <span className={`status-badge text-[10px] ${statusColors[conv.status] || ''}`}>
              {conv.status}
            </span>

            {conv.aiSuggestion && (
              <span className="status-badge text-[10px] bg-ai-bg text-ai">
                <Bot size={9} className="mr-0.5" />
                AI
              </span>
            )}

            {conv.priority === 'high' && conv.waitingTime && (
              <span className="status-badge text-[10px] bg-danger/10 text-danger">
                <Clock size={9} className="mr-0.5" />
                {conv.waitingTime}
              </span>
            )}

            {conv.unread > 0 && (
              <span className="ml-auto flex-shrink-0 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-700 flex items-center justify-center">
                {conv.unread}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
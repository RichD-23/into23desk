'use client';

import React, { useState } from 'react';
import {
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  Star,
  Tag,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Package,
  Bot,
  Zap,
  Clock,
} from 'lucide-react';
import { type Conversation, languageLabels, languageFlagClasses } from './inboxData';

interface ContactContextPanelProps {
  conversation: Conversation;
}

const orderStatusColors: Record<string, string> = {
  'In Transit': 'status-assigned',
  'Delivered': 'status-resolved',
  'Processing': 'status-open',
  'Delayed': 'status-pending',
  'Confirmed': 'status-open',
  'Active': 'status-resolved',
  'Return Requested': 'status-pending',
};

const tagColors: Record<string, string> = {
  'vip': 'bg-purple-100 text-purple-700',
  'repeat-buyer': 'bg-blue-100 text-blue-700',
  'return-request': 'bg-red-100 text-red-700',
  'escalated': 'bg-orange-100 text-orange-700',
  'new-customer': 'bg-green-100 text-green-700',
  'loyal': 'bg-indigo-100 text-indigo-700',
};

export default function ContactContextPanel({ conversation }: ContactContextPanelProps) {
  const [ordersExpanded, setOrdersExpanded] = useState(true);
  const { contact } = conversation;

  const aiDeflectionTopics = [
    { topic: 'Order tracking', confidence: 92 },
    { topic: 'Delivery delay', confidence: 87 },
    { topic: 'Return policy', confidence: 74 },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-thin">
      {/* Contact Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-[16px] font-700 text-foreground">
            {contact.name.charAt(0)}
          </div>
          <div>
            <h3 className="text-[14px] font-700 text-foreground">{contact.name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`status-badge text-[10px] ${languageFlagClasses[contact.language] || 'language-badge-en'}`}
              >
                {languageLabels[contact.language]}
              </span>
              <span className="text-[11px] text-muted-foreground">{contact.location}</span>
            </div>
          </div>
        </div>

        {/* Tags */}
        {contact.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {contact.tags.map((tag) => (
              <span
                key={`tag-${contact.id}-${tag}`}
                className={`status-badge text-[10px] ${tagColors[tag] || 'bg-secondary text-secondary-foreground'}`}
              >
                <Tag size={9} className="mr-0.5" />
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Contact Details */}
      <div className="px-4 py-3 border-b border-border space-y-2">
        <p className="text-[11px] font-700 uppercase tracking-widest text-muted-foreground mb-2">
          Contact Info
        </p>
        <div className="flex items-center gap-2 text-[12px] text-foreground">
          <Phone size={12} className="text-muted-foreground flex-shrink-0" />
          <span className="font-mono">{contact.phone}</span>
        </div>
        {contact.email && (
          <div className="flex items-center gap-2 text-[12px] text-foreground">
            <Mail size={12} className="text-muted-foreground flex-shrink-0" />
            <span className="truncate">{contact.email}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-[12px] text-foreground">
          <MapPin size={12} className="text-muted-foreground flex-shrink-0" />
          <span>{contact.location}</span>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-foreground">
          <ShoppingBag size={12} className="text-muted-foreground flex-shrink-0" />
          <span>{contact.platform}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 py-3 border-b border-border">
        <p className="text-[11px] font-700 uppercase tracking-widest text-muted-foreground mb-2">
          Customer Stats
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-secondary rounded-lg px-3 py-2">
            <p className="text-[10px] text-muted-foreground">Conversations</p>
            <p className="text-[16px] font-700 text-foreground tabular-nums">
              {contact.totalConversations}
            </p>
          </div>
          <div className="bg-secondary rounded-lg px-3 py-2">
            <p className="text-[10px] text-muted-foreground">Avg CSAT</p>
            <p className="text-[16px] font-700 text-foreground tabular-nums flex items-center gap-1">
              {contact.avgCsat > 0 ? (
                <>
                  {contact.avgCsat}
                  <Star size={11} className="text-warning fill-warning" />
                </>
              ) : (
                <span className="text-muted-foreground text-[13px]">No data</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Orders */}
      <div className="px-4 py-3 border-b border-border">
        <button
          onClick={() => setOrdersExpanded(!ordersExpanded)}
          className="flex items-center justify-between w-full mb-2"
        >
          <p className="text-[11px] font-700 uppercase tracking-widest text-muted-foreground">
            Orders ({contact.orders.length})
          </p>
          {ordersExpanded ? (
            <ChevronUp size={13} className="text-muted-foreground" />
          ) : (
            <ChevronDown size={13} className="text-muted-foreground" />
          )}
        </button>
        {ordersExpanded && (
          <div className="space-y-2">
            {contact.orders.map((order) => (
              <div
                key={order.id}
                className="bg-secondary rounded-lg px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Package size={11} className="text-muted-foreground flex-shrink-0" />
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {order.id}
                      </span>
                    </div>
                    <p className="text-[12px] font-500 text-foreground truncate">{order.name}</p>
                    <p className="text-[11px] text-muted-foreground">{order.date}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span
                      className={`status-badge text-[10px] ${orderStatusColors[order.status] || 'status-open'}`}
                    >
                      {order.status}
                    </span>
                    <span className="text-[12px] font-700 text-foreground tabular-nums">
                      {order.amount}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Deflection Suggestions */}
      {conversation.aiSuggestion && (
        <div className="px-4 py-3 border-b border-border">
          <p className="text-[11px] font-700 uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
            <Bot size={11} className="text-ai" />
            AI Insights
          </p>
          <div className="space-y-1.5">
            {aiDeflectionTopics.map((item) => (
              <div
                key={`ai-topic-${item.topic.replace(/\s+/g, '-')}`}
                className="flex items-center justify-between"
              >
                <span className="text-[12px] text-foreground">{item.topic}</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-ai rounded-full"
                      style={{ width: `${item.confidence}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground w-8 text-right">
                    {item.confidence}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-4 py-3">
        <p className="text-[11px] font-700 uppercase tracking-widest text-muted-foreground mb-2">
          Quick Actions
        </p>
        <div className="space-y-1.5">
          <button className="w-full flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg text-[12px] font-500 text-foreground hover:bg-border transition-colors">
            <ExternalLink size={12} className="text-muted-foreground" />
            View on {contact.platform}
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg text-[12px] font-500 text-foreground hover:bg-border transition-colors">
            <Zap size={12} className="text-ai" />
            Trigger AI Deflection
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg text-[12px] font-500 text-foreground hover:bg-border transition-colors">
            <Clock size={12} className="text-muted-foreground" />
            Set Follow-up Reminder
          </button>
        </div>
      </div>
    </div>
  );
}
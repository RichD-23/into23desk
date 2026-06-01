import React from 'react';

type BadgeVariant =
  | 'open' |'assigned' |'pending' |'resolved' |'archived' |'draft' |'published' |'ai' |'default';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  open: 'status-open',
  assigned: 'status-assigned',
  pending: 'status-pending',
  resolved: 'status-resolved',
  archived: 'status-archived',
  draft: 'status-draft',
  published: 'status-published',
  ai: 'bg-ai-bg text-ai',
  default: 'bg-secondary text-secondary-foreground',
};

export default function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span className={`status-badge ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}
import { ReactNode } from 'react';

interface EmptyStateProps {
  emoji: string;
  title: string;
  description: string;
  action?: ReactNode;
}

/**
 * Reusable empty state for any list/page.
 * Uses dotted border, friendly emoji, Swedish text.
 */
export function EmptyState({ emoji, title, description, action }: EmptyStateProps) {
  return (
    <div
      className="text-center py-10 px-6"
      style={{ borderRadius: 16, border: '2px dashed rgba(0,0,0,0.1)' }}
    >
      <div className="text-4xl mb-3">{emoji}</div>
      <div className="text-sm font-semibold text-foreground mb-1">{title}</div>
      <p className="text-xs text-muted-foreground mb-4 max-w-[240px] mx-auto">{description}</p>
      {action}
    </div>
  );
}

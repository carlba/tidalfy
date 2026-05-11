import * as React from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: React.ReactNode;
  title?: string;
  description: string;
}

export function EmptyState({ icon, title, description, className, ...props }: EmptyStateProps) {
  return (
    <div className={cn('text-center py-12 text-muted-foreground', className)} {...props}>
      <div className="mx-auto mb-3">{icon}</div>
      {title ? <p className="text-sm font-medium mb-1">{title}</p> : null}
      <p className="text-sm">{description}</p>
    </div>
  );
}

import * as React from 'react';
import { cn } from '@/lib/utils';

export type DetailTextProps = React.HTMLAttributes<HTMLParagraphElement>;

export function DetailText({ className, ...props }: DetailTextProps) {
  return <p className={cn('text-xs text-muted-foreground truncate', className)} {...props} />;
}

import { cn } from '@/lib/utils';
import { type BadgeProps, Badge } from '@/components/ui/badge';

export function SmallBadge({ className, ...props }: BadgeProps) {
  return <Badge className={cn('text-xs px-1 py-0', className)} {...props} />;
}

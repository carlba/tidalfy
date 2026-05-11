import { Button } from '@/components/ui/button';
import type { TrackStatus } from '@/lib/api';

interface StatusTabsProps {
  value: TrackStatus;
  onChange: (value: TrackStatus) => void;
}

const STATUS_OPTIONS: Array<{ value: TrackStatus; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'all', label: 'All' },
];

export function StatusTabs({ value, onChange }: StatusTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 pb-3">
      {STATUS_OPTIONS.map(option => (
        <Button
          key={option.value}
          size="sm"
          variant={value === option.value ? 'default' : 'outline'}
          onClick={() => onChange(option.value)}>
          {option.label}
        </Button>
      ))}
    </div>
  );
}

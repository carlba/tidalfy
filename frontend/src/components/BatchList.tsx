import type { ImportBatch } from '@/lib/types';

interface BatchListProps {
  batches: ImportBatch[];
  selectedBatchId: string | null;
  onSelect: (batchId: string) => void;
}

export function BatchList({ batches, selectedBatchId, onSelect }: BatchListProps) {
  if (batches.length === 0) {
    return <p className="text-sm text-muted-foreground px-4 pb-4">No imports yet.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {batches.map(batch => (
        <li key={batch.id}>
          <button
            className={
              'w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ' +
              (selectedBatchId === batch.id ? 'bg-muted font-medium' : '')
            }
            onClick={() => onSelect(batch.id)}>
            <p className="text-sm truncate">{batch.fileName}</p>
            <p className="text-xs text-muted-foreground">
              {batch.trackCount} tracks · {new Date(batch.importedAt).toLocaleDateString()}
            </p>
          </button>
        </li>
      ))}
    </ul>
  );
}

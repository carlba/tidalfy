import { Music2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { TrackListItem } from '@/components/TrackListItem';
import type { Track } from '@/lib/types';

interface TrackListProps {
  tracks: Track[];
  onSearchMatch: (track: Track) => void;
  onSearchDiscogs: (track: Track) => void;
  onArchive: (track: Track) => void;
  emptyMessage?: string;
}

export function TrackList({
  tracks,
  onSearchMatch,
  onSearchDiscogs,
  onArchive,
  emptyMessage,
}: TrackListProps) {
  if (tracks.length === 0) {
    return (
      <EmptyState
        icon={<Music2 className="h-12 w-12 mx-auto mb-3 opacity-30" />}
        description={emptyMessage ?? 'No tracks imported yet. Upload a Spotify CSV to get started.'}
      />
    );
  }

  return (
    <div className="divide-y divide-border rounded-lg border overflow-hidden">
      {tracks.map(track => (
        <TrackListItem
          key={track.id}
          track={track}
          onSearchMatch={onSearchMatch}
          onSearchDiscogs={onSearchDiscogs}
          onArchive={onArchive}
        />
      ))}
    </div>
  );
}

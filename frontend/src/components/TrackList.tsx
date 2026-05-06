import { Music2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Track } from '@/lib/types';

interface TrackListProps {
  tracks: Track[];
  onSearchMatch: (track: Track) => void;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function TrackList({ tracks, onSearchMatch }: TrackListProps) {
  if (tracks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Music2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No tracks imported yet. Upload a Spotify CSV to get started.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border rounded-lg border overflow-hidden">
      {tracks.map(track => (
        <div
          key={track.id}
          className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm truncate">{track.trackName}</p>
              {track.explicit && (
                <Badge variant="outline" className="text-xs px-1 py-0 shrink-0">
                  E
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {track.artistNames.join(', ')} · {track.albumName}
              {track.releaseDate ? ` · ${track.releaseDate.slice(0, 4)}` : ''}
            </p>
            {track.match ? (
              <div className="flex items-center gap-1 mt-1">
                <Check className="h-3 w-3 text-success shrink-0" />
                <span className="text-xs text-success truncate">
                  {track.match.title} — {track.match.artistCredit}
                  {track.match.releaseTitle ? ` · ${track.match.releaseTitle}` : ''}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
                <span className="text-xs text-amber-600">No MusicBrainz match</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-muted-foreground hidden sm:block">
              {formatDuration(track.durationMs)}
            </span>
            <Button size="sm" variant="outline" onClick={() => onSearchMatch(track)}>
              {track.match ? 'Change' : 'Match'}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

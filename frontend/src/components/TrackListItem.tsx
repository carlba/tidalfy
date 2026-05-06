import { Check, AlertCircle, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDuration } from '@/lib/utils';
import type { Track } from '@/lib/types';

interface TrackListItemProps {
  track: Track;
  onSearchMatch: (track: Track) => void;
  onArchive: (track: Track) => void;
}

export function TrackListItem({ track, onSearchMatch, onArchive }: TrackListItemProps) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{track.trackName}</p>
          {track.explicit && (
            <Badge variant="outline" className="text-xs px-1 py-0 shrink-0">
              E
            </Badge>
          )}
          {track.archived && (
            <Badge variant="secondary" className="text-xs px-1 py-0 shrink-0">
              Archived
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
              {track.match.releaseBarcode ? ` · UPC/EAN: ${track.match.releaseBarcode}` : ''}
              {track.match.releaseAsin ? ` · ASIN: ${track.match.releaseAsin}` : ''}
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
        <Button
          size="sm"
          variant="ghost"
          className="text-amber-600"
          onClick={() => onArchive(track)}>
          <Archive className="h-3.5 w-3.5 mr-1" />
          {track.archived ? 'Unarchive' : 'Archive'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => onSearchMatch(track)}>
          {track.match ? 'Change' : 'Match'}
        </Button>
      </div>
    </div>
  );
}

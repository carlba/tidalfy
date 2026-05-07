import { Check, AlertCircle, Archive, Disc, Music2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDuration } from '@/lib/utils';
import type { Track } from '@/lib/types';

interface TrackListItemProps {
  track: Track;
  onSearchMatch: (track: Track) => void;
  onSearchDiscogs: (track: Track) => void;
  onArchive: (track: Track) => void;
}

function discogsResourceUrlToWebUrl(resourceUrl: string | null): string | null {
  if (!resourceUrl) return null;
  return resourceUrl.replace('https://api.discogs.com/', 'https://www.discogs.com/');
}

export function TrackListItem({
  track,
  onSearchMatch,
  onSearchDiscogs,
  onArchive,
}: TrackListItemProps) {
  const addedAtText = track.addedAt
    ? new Date(track.addedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
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
              {track.artistNames.join(', ')}{track.albumName ? ` · ${track.albumName}` : ''}
            </p>
          </div>
        </div>
        {track.match ? (
          <div className="flex flex-col gap-1 mt-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <Check className="h-3 w-3 text-success shrink-0" />
                <span className="text-xs text-success truncate">
                  {track.match.title} — {track.match.artistCredit}
                  {track.match.releaseTitle ? ` · ${track.match.releaseTitle}` : ''}
                </span>
              </div>
              {track.match.releaseId ? (
                <a
                  href={`https://musicbrainz.org/release/${track.match.releaseId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs text-foreground hover:bg-muted/80">
                  <Music2 className="h-3.5 w-3.5" />
                  <span className="sr-only">Open MusicBrainz release</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
            {(track.match.releaseBarcode || track.match.isrc) && (
              <p className="text-xs text-success truncate">
                {track.match.releaseBarcode ? `EAN: ${track.match.releaseBarcode}` : ''}
                {track.match.releaseBarcode && track.match.isrc ? ' · ' : ''}
                {track.match.isrc ? `ISRC: ${track.match.isrc}` : ''}
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 mt-1">
            <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
            <span className="text-xs text-amber-600">No MusicBrainz match</span>
          </div>
        )}
        {track.discogsMatch ? (
          <div className="flex flex-col gap-1 mt-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <Check className="h-3 w-3 text-slate-600 shrink-0" />
                <span className="text-xs text-slate-600 truncate">
                  Discogs: {track.discogsMatch.releaseTitle ?? track.discogsMatch.title}
                </span>
              </div>
              {discogsResourceUrlToWebUrl(track.discogsMatch.resourceUrl) ? (
                <a
                  href={discogsResourceUrlToWebUrl(track.discogsMatch.resourceUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs text-foreground hover:bg-muted/80">
                  <Disc className="h-3.5 w-3.5" />
                  <span className="sr-only">Open Discogs release</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
            {track.discogsMatch.releaseBarcode ? (
              <p className="text-xs text-slate-600 truncate">
                EAN: {track.discogsMatch.releaseBarcode}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col items-end gap-2 shrink-0">
        {addedAtText ? (
          <p className="text-xs text-muted-foreground whitespace-nowrap">Added {addedAtText}</p>
        ) : null}
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            className="text-amber-600"
            onClick={() => onArchive(track)}>
            <Archive className="h-3.5 w-3.5 mr-1" />
            {track.archived ? 'Unarchive' : 'Archive'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => onSearchDiscogs(track)}>
            {track.discogsMatch ? 'Discogs' : 'Add Discogs'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => onSearchMatch(track)}>
            {track.match ? 'Change' : 'Match'}
          </Button>
        </div>
      </div>
    </div>
  );
}

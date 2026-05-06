import { useState } from 'react';
import { Music, Loader2, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { searchMusicBrainz, saveMatch } from '@/lib/api';
import type { MusicBrainzCandidate, Track } from '@/lib/types';

interface MusicBrainzDialogProps {
  track: Track | null;
  onClose: () => void;
  onMatchSaved: (trackId: string, candidate: MusicBrainzCandidate) => void;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function MusicBrainzDialog({ track, onClose, onMatchSaved }: MusicBrainzDialogProps) {
  const [candidates, setCandidates] = useState<MusicBrainzCandidate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [savingMbid, setSavingMbid] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [includeAlbum, setIncludeAlbum] = useState(false);
  const [albumFilter, setAlbumFilter] = useState<string | undefined>(undefined);
  const [useScoreOnly, setUseScoreOnly] = useState(false);

  const albumFilterValue = albumFilter ?? track?.albumName ?? '';

  async function handleSearch() {
    if (!track) return;
    setIsSearching(true);
    setSearchError(null);
    setHasSearched(false);
    try {
      const results = await searchMusicBrainz(
        track.id,
        includeAlbum,
        albumFilterValue,
        useScoreOnly
      );
      setCandidates(results);
      setHasSearched(true);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  }

  async function handleSelect(candidate: MusicBrainzCandidate) {
    if (!track) return;
    setSavingMbid(candidate.mbid);
    try {
      await saveMatch(track.id, candidate);
      onMatchSaved(track.id, candidate);
      onClose();
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Failed to save match');
    } finally {
      setSavingMbid(null);
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      onClose();
      setCandidates([]);
      setHasSearched(false);
      setSearchError(null);
    }
  }

  return (
    <Dialog open={track !== null} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Find MusicBrainz Match</DialogTitle>
          {track && (
            <DialogDescription>
              Searching for <strong>{track.trackName}</strong> by{' '}
              <strong>{track.artistNames.join(', ')}</strong>
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-y-auto flex-1 min-h-0">
          {track?.match && (
            <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded-lg text-sm">
              <Check className="h-4 w-4 text-success shrink-0" />
              <span className="text-success">
                Currently matched: <strong>{track.match.title}</strong> — {track.match.artistCredit}
              </span>
            </div>
          )}

          <fieldset className="rounded-lg border border-border bg-muted/5 p-4">
            <legend className="text-sm font-semibold text-foreground">Search options</legend>
            <p className="text-sm text-muted-foreground mb-3">
              Spotify album name is prefilled from the selected track. Enable the filter to use it
              in the MusicBrainz query.
            </p>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">Spotify album</span>
              <input
                type="text"
                value={albumFilterValue}
                onChange={event => setAlbumFilter(event.target.value)}
                placeholder="Type album name to filter results"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeAlbum}
                  onChange={event => setIncludeAlbum(event.target.checked)}
                  className="h-5 w-5 rounded border-muted-foreground accent-primary focus:ring-primary"
                />
                <span className="font-medium">Apply album name filter to search</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={useScoreOnly}
                  onChange={event => setUseScoreOnly(event.target.checked)}
                  className="h-5 w-5 rounded border-muted-foreground accent-primary focus:ring-primary"
                />
                <span className="font-medium">Sort by MusicBrainz score only</span>
              </label>
              <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                {useScoreOnly ? 'Score-only sorting' : 'Custom ranking'}
              </span>
            </div>
            <Button
              className="mt-1"
              onClick={handleSearch}
              disabled={isSearching}
              variant="outline">
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching MusicBrainz…
                </>
              ) : (
                <>
                  <Music className="h-4 w-4 mr-2" />
                  {hasSearched ? 'Search Again' : 'Search MusicBrainz'}
                </>
              )}
            </Button>
          </fieldset>

          {searchError && <p className="text-sm text-destructive">{searchError}</p>}

          {hasSearched && candidates.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No matches found. Try a different track or check the spelling.
            </p>
          )}

          {candidates.length > 0 && (
            <div className="flex flex-col overflow-hidden rounded-lg border">
              <div className="overflow-y-auto max-h-[45vh] min-h-0">
                <ul className="divide-y divide-border">
                  {candidates.map(candidate => (
                    <li
                      key={candidate.mbid}
                      className="flex items-start justify-between gap-3 p-3 hover:bg-muted/50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{candidate.title}</p>
                        <p className="text-xs text-muted-foreground">{candidate.artistCredit}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          MBID: {candidate.mbid}
                        </p>
                        {candidate.releaseTitle && (
                          <p className="text-xs text-muted-foreground truncate">
                            {candidate.releaseTitle}
                            {candidate.releaseDate ? ` · ${candidate.releaseDate}` : ''}
                            {candidate.releaseCountry ? ` · ${candidate.releaseCountry}` : ''}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {candidate.durationMs !== null && (
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              {formatDuration(candidate.durationMs)}
                            </Badge>
                          )}
                          {candidate.releaseCountry && (
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              {candidate.releaseCountry}
                            </Badge>
                          )}
                          {candidate.disambiguation && (
                            <span className="text-[10px] text-muted-foreground italic">
                              {candidate.disambiguation}
                            </span>
                          )}
                          {candidate.score !== null && (
                            <Badge
                              variant={candidate.score >= 90 ? 'success' : 'secondary'}
                              className="text-xs px-1 py-0">
                              Score: {candidate.score}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSelect(candidate)}
                        disabled={savingMbid !== null}>
                        {savingMbid === candidate.mbid ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          'Select'
                        )}
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

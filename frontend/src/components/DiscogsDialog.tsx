import { useState } from 'react';
import { Search, Loader2, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { searchDiscogs, saveDiscogsMatch } from '@/lib/api';
import type { DiscogsCandidate, DiscogsMatch, Track } from '@/lib/types';

interface DiscogsDialogProps {
  track: Track | null;
  onClose: () => void;
  onMatchSaved: (trackId: string, candidate: DiscogsMatch) => void;
}

export function DiscogsDialog({ track, onClose, onMatchSaved }: DiscogsDialogProps) {
  const [candidates, setCandidates] = useState<DiscogsCandidate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [savingReleaseId, setSavingReleaseId] = useState<string | null>(null);
  const [albumFilter, setAlbumFilter] = useState<string>('');
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch() {
    if (!track) return;
    setIsSearching(true);
    setSearchError(null);
    setHasSearched(false);

    try {
      const searchAlbumName = albumFilter.trim() || undefined;
      const results = await searchDiscogs(track.id, searchAlbumName);
      setCandidates(results);
      setHasSearched(true);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  }

  async function handleSelect(candidate: DiscogsCandidate) {
    if (!track) return;
    setSavingReleaseId(candidate.discogsReleaseId);
    try {
      const saved = await saveDiscogsMatch(track.id, candidate);
      onMatchSaved(track.id, saved);
      onClose();
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Failed to save Discogs match');
    } finally {
      setSavingReleaseId(null);
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      onClose();
      setCandidates([]);
      setSearchError(null);
      setAlbumFilter('');
      setHasSearched(false);
    }
  }

  return (
    <Dialog open={track !== null} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Find Discogs Match</DialogTitle>
          {track && (
            <DialogDescription>
              Search Discogs for <strong>{track.trackName}</strong> by{' '}
              <strong>{track.artistNames.join(', ')}</strong>
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-y-auto flex-1 min-h-0">
          {track?.discogsMatch && (
            <div className="flex items-center gap-2 p-3 bg-slate-100 border border-slate-200 rounded-lg text-sm">
              <Check className="h-4 w-4 text-slate-700 shrink-0" />
              <span className="text-slate-700">
                Currently matched via Discogs:{' '}
                <strong>{track.discogsMatch.releaseTitle ?? track.discogsMatch.title}</strong>
              </span>
            </div>
          )}

          <fieldset className="rounded-lg border border-border bg-muted/5 p-4">
            <legend className="text-sm font-semibold text-foreground">Search options</legend>
            <p className="text-sm text-muted-foreground mb-3">
              Spotify album name is optional. Leave it blank to search Discogs by track and artist
              only.
            </p>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">Spotify album</span>
              <Input
                type="text"
                value={albumFilter}
                onChange={event => setAlbumFilter(event.target.value)}
                placeholder={
                  track?.albumName
                    ? `Optional: ${track.albumName}`
                    : 'Type album name to filter results'
                }
              />
            </label>
            <Button
              className="mt-4"
              onClick={handleSearch}
              disabled={isSearching}
              variant="outline">
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching Discogs…
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  {hasSearched ? 'Search Again' : 'Search Discogs'}
                </>
              )}
            </Button>
          </fieldset>

          {searchError && <p className="text-sm text-destructive">{searchError}</p>}

          {hasSearched && candidates.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No Discogs matches found. Try a different album filter.
            </p>
          )}

          {candidates.length > 0 && (
            <div className="flex flex-col overflow-hidden rounded-lg border">
              <div className="overflow-y-auto max-h-[45vh] min-h-0">
                <ul className="divide-y divide-border">
                  {candidates.map(candidate => (
                    <li key={candidate.discogsReleaseId} className="p-4">
                      <div className="flex items-start gap-4">
                        {candidate.releaseCoverArtUrl ? (
                          <img
                            src={candidate.releaseCoverArtUrl}
                            alt={candidate.releaseTitle ?? 'Release cover art'}
                            className="h-16 w-16 rounded-md object-cover"
                          />
                        ) : (
                          <div className="h-16 w-16 rounded-md bg-muted" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">
                            {candidate.releaseTitle ?? candidate.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {candidate.artistCredit}
                            {candidate.releaseDate ? ` · ${candidate.releaseDate}` : ''}
                            {candidate.releaseCountry ? ` · ${candidate.releaseCountry}` : ''}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {candidate.releaseLabel ? `${candidate.releaseLabel}` : ''}
                            {candidate.releaseFormat ? ` · ${candidate.releaseFormat}` : ''}
                            {candidate.releaseBarcode ? ` · EAN: ${candidate.releaseBarcode}` : ''}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleSelect(candidate)}
                          disabled={savingReleaseId === candidate.discogsReleaseId}>
                          {savingReleaseId === candidate.discogsReleaseId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Select'
                          )}
                        </Button>
                      </div>
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

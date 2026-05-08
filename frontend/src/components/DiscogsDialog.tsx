import { useMemo, useState } from 'react';
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
import { DiscogsCandidateItem } from '@/components/DiscogsCandidateItem';
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
  const [searchTitle, setSearchTitle] = useState<string>(track?.trackName ?? '');
  const [searchArtist, setSearchArtist] = useState<string>(track?.artistNames[0] ?? '');
  const [albumFilter, setAlbumFilter] = useState<string>('');
  const [extended, setExtended] = useState(false);
  const [freeText, setFreeText] = useState(false);
  const [sortByDate, setSortByDate] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch() {
    if (!track) return;
    setIsSearching(true);
    setSearchError(null);
    setHasSearched(false);

    try {
      const searchAlbumName = albumFilter.trim() || undefined;
      const searchTitleValue = searchTitle.trim() || undefined;
      const searchArtistValue = searchArtist.trim() || undefined;
      const results = await searchDiscogs(
        track.id,
        searchTitleValue,
        searchArtistValue,
        searchAlbumName,
        extended,
        freeText
      );
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
      setSearchTitle(track?.trackName ?? '');
      setSearchArtist(track?.artistNames[0] ?? '');
      setAlbumFilter('');
      setExtended(false);
      setFreeText(false);
      setSortByDate(false);
      setHasSearched(false);
    }
  }

  const sortedCandidates = useMemo(() => {
    if (!sortByDate) {
      return candidates;
    }

    return [...candidates].sort((left, right) => {
      const leftDate = left.releaseDate ?? '';
      const rightDate = right.releaseDate ?? '';

      if (!leftDate && !rightDate) {
        return 0;
      }
      if (!leftDate) {
        return 1;
      }
      if (!rightDate) {
        return -1;
      }

      return leftDate.localeCompare(rightDate);
    });
  }, [candidates, sortByDate]);

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
              Edit the title used for search. Spotify album name is optional and only used if
              provided.
            </p>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">Search title</span>
              <Input
                type="text"
                value={searchTitle}
                onChange={event => setSearchTitle(event.target.value)}
                placeholder={track?.trackName ?? 'Type title to search'}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">Search artist</span>
              <Input
                type="text"
                value={searchArtist}
                onChange={event => setSearchArtist(event.target.value)}
                placeholder={track?.artistNames[0] ?? 'Type artist to search'}
              />
            </label>
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
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={extended}
                onChange={event => setExtended(event.target.checked)}
                className="h-5 w-5 rounded border-muted-foreground accent-primary focus:ring-primary"
              />
              <span className="font-medium">Include non-master albums and singles</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={freeText}
                onChange={event => setFreeText(event.target.checked)}
                className="h-5 w-5 rounded border-muted-foreground accent-primary focus:ring-primary"
              />
              <span className="font-medium">Use free-text Discogs search</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={sortByDate}
                onChange={event => setSortByDate(event.target.checked)}
                className="h-5 w-5 rounded border-muted-foreground accent-primary focus:ring-primary"
              />
              <span className="font-medium">Sort results by release date</span>
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

          {hasSearched && sortedCandidates.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No Discogs matches found. Try a different album filter.
            </p>
          )}

          {sortedCandidates.length > 0 && (
            <div className="flex flex-col overflow-hidden rounded-lg border">
              <div className="overflow-y-auto max-h-[45vh] min-h-0">
                <ul className="divide-y divide-border">
                  {sortedCandidates.map(candidate => (
                    <li key={candidate.discogsReleaseId} className="border-b last:border-b-0">
                      <DiscogsCandidateItem
                        candidate={candidate}
                        savingReleaseId={savingReleaseId}
                        onSelect={handleSelect}
                      />
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

import { useMemo, useState } from 'react';
import { Music, Loader2, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MusicBrainzCandidateGroup } from '@/components/MusicBrainzCandidateGroup';
import { searchMusicBrainz, saveMatch } from '@/lib/api';
import type { MusicBrainzCandidate, Track } from '@/lib/types';

interface MusicBrainzDialogProps {
  track: Track | null;
  onClose: () => void;
  onMatchSaved: (trackId: string, candidate: MusicBrainzCandidate) => void;
}

function groupCandidatesByMbid(candidates: MusicBrainzCandidate[]) {
  return Array.from(
    candidates
      .reduce<Map<string, MusicBrainzCandidate[]>>((groups, candidate) => {
        const existing = groups.get(candidate.mbid);
        if (existing) {
          existing.push(candidate);
        } else {
          groups.set(candidate.mbid, [candidate]);
        }
        return groups;
      }, new Map())
      .entries()
  );
}

export function MusicBrainzDialog({ track, onClose, onMatchSaved }: MusicBrainzDialogProps) {
  const [candidates, setCandidates] = useState<MusicBrainzCandidate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [savingMbid, setSavingMbid] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchTitle, setSearchTitle] = useState<string>(track?.trackName ?? '');
  const [searchArtist, setSearchArtist] = useState<string>(track?.artistNames.join(', ') ?? '');
  const [includeAlbum, setIncludeAlbum] = useState(false);
  const [albumFilter, setAlbumFilter] = useState<string | undefined>(undefined);
  const [useArtistFilter, setUseArtistFilter] = useState(true);
  const [useTitleFilter, setUseTitleFilter] = useState(true);
  const [useScoreOnly, setUseScoreOnly] = useState(false);
  const [searchOnlyAlbum, setSearchOnlyAlbum] = useState(true);
  const [searchNoSecondaryType, setSearchNoSecondaryType] = useState(true);
  const [fetchReleaseMetadata, setFetchReleaseMetadata] = useState(true);
  const [resultFilter, setResultFilter] = useState('');
  const [expandedMbids, setExpandedMbids] = useState<Set<string>>(new Set());

  const albumFilterValue = albumFilter ?? track?.albumName ?? '';

  async function handleSearch() {
    if (!track) return;
    setIsSearching(true);
    setSearchError(null);
    setHasSearched(false);
    try {
      const results = await searchMusicBrainz(
        track.id,
        searchTitle,
        useTitleFilter,
        searchArtist,
        useArtistFilter,
        includeAlbum,
        includeAlbum ? albumFilterValue : '',
        useScoreOnly,
        searchOnlyAlbum,
        searchNoSecondaryType,
        fetchReleaseMetadata
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
      setIncludeAlbum(false);
      setFetchReleaseMetadata(true);
      setSearchOnlyAlbum(true);
      setSearchNoSecondaryType(true);
      setUseArtistFilter(true);
      setResultFilter('');
      setExpandedMbids(new Set());
      setSearchTitle(track?.trackName ?? '');
      setSearchArtist(track?.artistNames.join(', ') ?? '');
    }
  }

  const filteredCandidates = useMemo(() => {
    const text = resultFilter.trim().toLowerCase();
    if (!text) {
      return candidates;
    }

    return candidates.filter(candidate => {
      const fields = [
        candidate.title,
        candidate.artistCredit,
        candidate.releaseTitle ?? '',
        candidate.releaseCountry ?? '',
        candidate.releaseStatus ?? '',
        candidate.releaseType ?? '',
        candidate.releasePackaging ?? '',
        candidate.disambiguation ?? '',
        candidate.isrc ?? '',
        candidate.releaseBarcode ?? '',
        candidate.releaseSecondaryTypes?.join(' ') ?? '',
      ]
        .join(' ')
        .toLowerCase();

      return fields.includes(text);
    });
  }, [candidates, resultFilter]);

  function toggleGroup(mbid: string) {
    setExpandedMbids(current => {
      const next = new Set(current);
      if (next.has(mbid)) {
        next.delete(mbid);
      } else {
        next.add(mbid);
      }
      return next;
    });
  }

  return (
    <Dialog key={track?.id ?? 'none'} open={track !== null} onOpenChange={handleOpenChange}>
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
                Currently matched: <strong>{track.match.title}</strong> —{' '}
                {track.match.artistCredit.join(', ')}
              </span>
            </div>
          )}

          <fieldset className="rounded-lg border border-border bg-muted/5 p-4">
            <legend className="text-sm font-semibold text-foreground">Search options</legend>
            <p className="text-sm text-muted-foreground mb-3">
              Edit the title used for search. Spotify album name is prefilled from the selected
              track and can be optionally applied.
            </p>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useTitleFilter}
                  onChange={event => setUseTitleFilter(event.target.checked)}
                  className="h-4 w-4 rounded border-muted-foreground accent-primary focus:ring-primary"
                  aria-label="Enable title search"
                />
                <span className="font-medium">Title</span>
                <Input
                  type="text"
                  value={searchTitle}
                  onChange={event => setSearchTitle(event.target.value)}
                  placeholder={track?.trackName ?? 'Type title to search'}
                  disabled={!useTitleFilter}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useArtistFilter}
                  onChange={event => setUseArtistFilter(event.target.checked)}
                  className="h-4 w-4 rounded border-muted-foreground accent-primary focus:ring-primary"
                  aria-label="Enable artist search"
                />
                <span className="font-medium">Artist</span>
                <Input
                  type="text"
                  value={searchArtist}
                  onChange={event => setSearchArtist(event.target.value)}
                  placeholder={track?.artistNames.join(', ') ?? 'Type artist to search'}
                  disabled={!useArtistFilter}
                  aria-label="Artist search"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeAlbum}
                  onChange={event => setIncludeAlbum(event.target.checked)}
                  className="h-4 w-4 rounded border-muted-foreground accent-primary focus:ring-primary"
                  aria-label="Enable album search"
                />
                <span className="font-medium">Album</span>
                <Input
                  type="text"
                  value={albumFilterValue}
                  onChange={event => setAlbumFilter(event.target.value)}
                  placeholder="Type album name to filter results"
                  disabled={!includeAlbum}
                  aria-label="Album search"
                />
              </div>
            </div>
            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={useScoreOnly}
                  onChange={event => setUseScoreOnly(event.target.checked)}
                  className="h-5 w-5 rounded border-muted-foreground accent-primary focus:ring-primary"
                />
                <span className="font-medium">Sort by MusicBrainz score only</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={searchOnlyAlbum}
                  onChange={event => setSearchOnlyAlbum(event.target.checked)}
                  className="h-5 w-5 rounded border-muted-foreground accent-primary focus:ring-primary"
                />
                <span className="font-medium">Only Album releases</span>
              </label>
            </div>
            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={searchNoSecondaryType}
                  onChange={event => setSearchNoSecondaryType(event.target.checked)}
                  className="h-5 w-5 rounded border-muted-foreground accent-primary focus:ring-primary"
                />
                <span className="font-medium">No secondary release types</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={fetchReleaseMetadata}
                  onChange={event => setFetchReleaseMetadata(event.target.checked)}
                  className="h-5 w-5 rounded border-muted-foreground accent-primary focus:ring-primary"
                />
                <div>
                  <span className="font-medium">Fetch release metadata</span>
                  <p className="text-xs text-muted-foreground">
                    Load extra release metadata from MusicBrainz when available.
                  </p>
                </div>
              </label>
            </div>
            <Button
              className="mt-1"
              onClick={() => void handleSearch()}
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
            <label className="flex flex-col gap-2 text-sm mt-4">
              <span className="font-medium">Filter matches</span>
              <Input
                type="text"
                value={resultFilter}
                onChange={event => setResultFilter(event.target.value)}
                placeholder="Search all match text"
              />
            </label>
          </fieldset>

          {searchError && <p className="text-sm text-destructive">{searchError}</p>}

          {hasSearched && filteredCandidates.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {candidates.length === 0
                ? 'No matches found. Try a different track or check the spelling.'
                : 'No matches found for the current filter.'}
            </p>
          )}

          {filteredCandidates.length > 0 && (
            <div className="flex flex-col overflow-hidden rounded-lg border">
              <div className="overflow-y-auto max-h-[45vh] min-h-0">
                <ul className="divide-y divide-border">
                  {groupCandidatesByMbid(filteredCandidates).map(([mbid, group]) => {
                    const isExpanded = expandedMbids.has(mbid);

                    return (
                      <MusicBrainzCandidateGroup
                        key={mbid}
                        group={group}
                        isExpanded={isExpanded}
                        onToggle={() => toggleGroup(mbid)}
                        savingMbid={savingMbid}
                        onSelect={handleSelect}
                      />
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

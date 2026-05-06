import { useMemo, useState } from 'react';
import { Music, Loader2, Check, ChevronDown } from 'lucide-react';
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

function getMostCommonReleaseTitle(candidates: MusicBrainzCandidate[]): string | null {
  const releaseTitleCounts = new Map<string, number>();

  for (const candidate of candidates) {
    if (!candidate.releaseTitle) {
      continue;
    }

    releaseTitleCounts.set(
      candidate.releaseTitle,
      (releaseTitleCounts.get(candidate.releaseTitle) ?? 0) + 1
    );
  }

  if (releaseTitleCounts.size === 0) {
    return null;
  }

  return Array.from(releaseTitleCounts.entries()).reduce((best, current) => {
    return current[1] > best[1] ? current : best;
  })[0];
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
  const [typeFilter, setTypeFilter] = useState('Album');
  const [typeFilterReversed, setTypeFilterReversed] = useState(false);
  const [typeFilterExact, setTypeFilterExact] = useState(true);
  const [secondaryTypeFilter, setSecondaryTypeFilter] = useState('NULL');
  const [secondaryTypeFilterReversed, setSecondaryTypeFilterReversed] = useState(false);
  const [secondaryTypeFilterExact, setSecondaryTypeFilterExact] = useState(false);
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
      setTypeFilter('Album');
      setTypeFilterReversed(false);
      setTypeFilterExact(true);
      setSecondaryTypeFilter('NULL');
      setSecondaryTypeFilterReversed(false);
      setSecondaryTypeFilterExact(false);
      setExpandedMbids(new Set());
    }
  }

  const filteredCandidates = useMemo(() => {
    const normalizedTypeFilter = typeFilter.trim().toLowerCase();
    const normalizedSecondaryTypeFilter = secondaryTypeFilter.trim().toLowerCase();
    const isNullTypeFilter = normalizedTypeFilter === 'null';
    const isNullSecondaryFilter = normalizedSecondaryTypeFilter === 'null';

    return candidates.filter(candidate => {
      const releaseType = candidate.releaseType?.toLowerCase() ?? '';
      const secondaryTypes = candidate.releaseSecondaryTypes?.map(type => type.toLowerCase()) ?? [];

      const typeMatches = normalizedTypeFilter
        ? isNullTypeFilter
          ? releaseType === ''
          : typeFilterExact
            ? releaseType === normalizedTypeFilter
            : releaseType.includes(normalizedTypeFilter)
        : true;
      const secondaryMatches = normalizedSecondaryTypeFilter
        ? isNullSecondaryFilter
          ? secondaryTypes.length === 0
          : secondaryTypeFilterExact
            ? secondaryTypes.some(type => type === normalizedSecondaryTypeFilter)
            : secondaryTypes.some(type => type.includes(normalizedSecondaryTypeFilter))
        : true;

      const typePass = typeFilterReversed ? !typeMatches : typeMatches;
      const secondaryPass = secondaryTypeFilterReversed ? !secondaryMatches : secondaryMatches;

      return typePass && secondaryPass;
    });
  }, [
    candidates,
    typeFilter,
    typeFilterReversed,
    typeFilterExact,
    secondaryTypeFilter,
    secondaryTypeFilterReversed,
    secondaryTypeFilterExact,
  ]);

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
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm">
                <span className="flex items-center justify-between gap-2 font-medium">
                  <span>Release type</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTypeFilterExact(current => !current)}
                      className={`rounded-full border px-2 py-1 text-xs font-semibold transition ${
                        typeFilterExact
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-muted/10 text-foreground'
                      }`}>
                      Exact
                    </button>
                    <button
                      type="button"
                      onClick={() => setTypeFilterReversed(current => !current)}
                      className={`rounded-full border px-2 py-1 text-xs font-semibold transition ${
                        typeFilterReversed
                          ? 'border-destructive bg-destructive/10 text-destructive'
                          : 'border-border bg-muted/10 text-foreground'
                      }`}>
                      {typeFilterReversed ? 'Exclude' : 'Include'}
                    </button>
                  </div>
                </span>
                <input
                  type="text"
                  value={typeFilter}
                  onChange={event => setTypeFilter(event.target.value)}
                  placeholder="Filter release type (or NULL)"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span className="flex items-center justify-between gap-2 font-medium">
                  <span>Secondary type</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSecondaryTypeFilterExact(current => !current)}
                      className={`rounded-full border px-2 py-1 text-xs font-semibold transition ${
                        secondaryTypeFilterExact
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-muted/10 text-foreground'
                      }`}>
                      Exact
                    </button>
                    <button
                      type="button"
                      onClick={() => setSecondaryTypeFilterReversed(current => !current)}
                      className={`rounded-full border px-2 py-1 text-xs font-semibold transition ${
                        secondaryTypeFilterReversed
                          ? 'border-destructive bg-destructive/10 text-destructive'
                          : 'border-border bg-muted/10 text-foreground'
                      }`}>
                      {secondaryTypeFilterReversed ? 'Exclude' : 'Include'}
                    </button>
                  </div>
                </span>
                <input
                  type="text"
                  value={secondaryTypeFilter}
                  onChange={event => setSecondaryTypeFilter(event.target.value)}
                  placeholder="Filter secondary type (or NULL)"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
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
                  {groupCandidatesByMbid(filteredCandidates).map(([mbid, group]) => {
                    const isExpanded = expandedMbids.has(mbid);
                    const releaseTitle = getMostCommonReleaseTitle(group);

                    return (
                      <li key={mbid} className="border-b last:border-b-0">
                        {group.length > 1 ? (
                          <>
                            <button
                              type="button"
                              onClick={() => toggleGroup(mbid)}
                              className="flex w-full items-center justify-between gap-3 p-3 bg-muted/10 text-sm font-semibold text-foreground"
                              aria-expanded={isExpanded}>
                              <div className="min-w-0 text-left">
                                <p className="truncate">{group[0].title}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {group[0].artistCredit}
                                </p>
                                <p className="text-[11px] text-muted-foreground truncate">
                                  MBID: {mbid} · {group.length} results
                                </p>
                                {releaseTitle && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    Release: {releaseTitle}
                                  </p>
                                )}
                              </div>
                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                              />
                            </button>
                            {isExpanded && (
                              <ul className="divide-y divide-border">
                                {group.map(candidate => (
                                  <li
                                    key={`${candidate.mbid}-${candidate.releaseTitle ?? ''}-${candidate.releaseDate ?? ''}-${candidate.releaseCountry ?? ''}`}
                                    className="flex items-start justify-between gap-3 p-3 pl-10 hover:bg-muted/50 transition-colors">
                                    <div className="min-w-0 flex-1">
                                      <p className="font-medium text-sm truncate">
                                        {candidate.title}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {candidate.artistCredit}
                                      </p>
                                      <p className="text-[11px] text-muted-foreground truncate">
                                        MBID: {candidate.mbid}
                                      </p>
                                      {candidate.releaseTitle && (
                                        <p className="text-xs text-muted-foreground truncate">
                                          {candidate.releaseTitle}
                                          {candidate.releaseDate
                                            ? ` · ${candidate.releaseDate}`
                                            : ''}
                                          {candidate.releaseCountry
                                            ? ` · ${candidate.releaseCountry}`
                                            : ''}
                                        </p>
                                      )}
                                      {candidate.releaseType && (
                                        <p className="text-xs text-muted-foreground truncate">
                                          Type: {candidate.releaseType}
                                        </p>
                                      )}
                                      {candidate.releaseSecondaryTypes?.length ? (
                                        <p className="text-xs text-muted-foreground truncate">
                                          Secondary: {candidate.releaseSecondaryTypes.join(', ')}
                                        </p>
                                      ) : null}
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
                                            variant={
                                              candidate.score >= 90 ? 'success' : 'secondary'
                                            }
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
                            )}
                          </>
                        ) : (
                          <div className="flex items-start justify-between gap-3 p-3 hover:bg-muted/50 transition-colors">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{group[0].title}</p>
                              <p className="text-xs text-muted-foreground">
                                {group[0].artistCredit}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                MBID: {group[0].mbid}
                              </p>
                              {group[0].releaseTitle && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {group[0].releaseTitle}
                                  {group[0].releaseDate ? ` · ${group[0].releaseDate}` : ''}
                                  {group[0].releaseCountry ? ` · ${group[0].releaseCountry}` : ''}
                                </p>
                              )}
                              {group[0].releaseType && (
                                <p className="text-xs text-muted-foreground truncate">
                                  Type: {group[0].releaseType}
                                </p>
                              )}
                              {group[0].releaseSecondaryTypes?.length ? (
                                <p className="text-xs text-muted-foreground truncate">
                                  Secondary: {group[0].releaseSecondaryTypes.join(', ')}
                                </p>
                              ) : null}
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                {group[0].durationMs !== null && (
                                  <Badge variant="outline" className="text-xs px-1 py-0">
                                    {formatDuration(group[0].durationMs)}
                                  </Badge>
                                )}
                                {group[0].releaseCountry && (
                                  <Badge variant="outline" className="text-xs px-1 py-0">
                                    {group[0].releaseCountry}
                                  </Badge>
                                )}
                                {group[0].disambiguation && (
                                  <span className="text-[10px] text-muted-foreground italic">
                                    {group[0].disambiguation}
                                  </span>
                                )}
                                {group[0].score !== null && (
                                  <Badge
                                    variant={group[0].score >= 90 ? 'success' : 'secondary'}
                                    className="text-xs px-1 py-0">
                                    Score: {group[0].score}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleSelect(group[0])}
                              disabled={savingMbid !== null}>
                              {savingMbid === group[0].mbid ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                'Select'
                              )}
                            </Button>
                          </div>
                        )}
                      </li>
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

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

export function MusicBrainzDialog({ track, onClose, onMatchSaved }: MusicBrainzDialogProps) {
  const [candidates, setCandidates] = useState<MusicBrainzCandidate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [savingMbid, setSavingMbid] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch() {
    if (!track) return;
    setIsSearching(true);
    setSearchError(null);
    setHasSearched(false);
    try {
      const results = await searchMusicBrainz(track.id);
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

        <div className="flex flex-col gap-4 overflow-y-auto">
          {track?.match && (
            <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded-lg text-sm">
              <Check className="h-4 w-4 text-success shrink-0" />
              <span className="text-success">
                Currently matched: <strong>{track.match.title}</strong> — {track.match.artistCredit}
              </span>
            </div>
          )}

          <Button onClick={handleSearch} disabled={isSearching} variant="outline">
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

          {searchError && <p className="text-sm text-destructive">{searchError}</p>}

          {hasSearched && candidates.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No matches found. Try a different track or check the spelling.
            </p>
          )}

          {candidates.length > 0 && (
            <ul className="divide-y divide-border rounded-lg border overflow-hidden">
              {candidates.map(candidate => (
                <li
                  key={candidate.mbid}
                  className="flex items-start justify-between gap-3 p-3 hover:bg-muted/50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{candidate.title}</p>
                    <p className="text-xs text-muted-foreground">{candidate.artistCredit}</p>
                    {candidate.releaseTitle && (
                      <p className="text-xs text-muted-foreground truncate">
                        {candidate.releaseTitle}
                        {candidate.releaseDate ? ` · ${candidate.releaseDate}` : ''}
                      </p>
                    )}
                    {candidate.score !== null && (
                      <Badge
                        variant={candidate.score >= 90 ? 'success' : 'secondary'}
                        className="mt-1">
                        Score: {candidate.score}
                      </Badge>
                    )}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

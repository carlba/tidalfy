import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DiscogsCandidateDetails } from '@/components/DiscogsCandidateDetails';
import type { DiscogsCandidate } from '@/lib/types';

interface DiscogsCandidateItemProps {
  candidate: DiscogsCandidate;
  savingReleaseId: string | null;
  onSelect: (candidate: DiscogsCandidate) => void;
}

export function DiscogsCandidateItem({
  candidate,
  savingReleaseId,
  onSelect,
}: DiscogsCandidateItemProps) {
  return (
    <div className="flex items-start justify-between gap-3 p-3 hover:bg-muted/50 transition-colors">
      <div className="min-w-0 flex-1 flex gap-3">
        {candidate.releaseCoverArtUrl ? (
          <img
            src={candidate.releaseCoverArtUrl}
            alt={`${candidate.releaseTitle ?? 'Release'} cover art`}
            className="h-20 w-20 rounded-md object-cover"
          />
        ) : (
          <div className="h-20 w-20 rounded-md bg-muted" />
        )}

        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">
            {candidate.releaseTitle ?? candidate.title}
          </p>
          <p className="text-xs text-muted-foreground truncate">{candidate.artistCredit}</p>
          <DiscogsCandidateDetails candidate={candidate} />
        </div>
      </div>

      <Button size="sm" onClick={() => onSelect(candidate)} disabled={savingReleaseId !== null}>
        {savingReleaseId === candidate.discogsReleaseId ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          'Select'
        )}
      </Button>
    </div>
  );
}

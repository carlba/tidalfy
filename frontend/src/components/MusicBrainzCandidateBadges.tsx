import { formatDuration } from '@/lib/utils';
import { SmallBadge } from '@/components/ui/small-badge';
import type { MusicBrainzCandidate } from '@/lib/types';

interface MusicBrainzCandidateBadgesProps {
  candidate: MusicBrainzCandidate;
}

export function MusicBrainzCandidateBadges({ candidate }: MusicBrainzCandidateBadgesProps) {
  if (
    candidate.durationMs === null &&
    !candidate.releaseCountry &&
    !candidate.disambiguation &&
    candidate.score === null
  ) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {candidate.durationMs !== null && (
        <SmallBadge variant="outline">{formatDuration(candidate.durationMs)}</SmallBadge>
      )}
      {candidate.releaseCountry && (
        <SmallBadge variant="outline">{candidate.releaseCountry}</SmallBadge>
      )}
      {candidate.disambiguation && (
        <span className="text-[10px] text-muted-foreground italic">{candidate.disambiguation}</span>
      )}
      {candidate.score !== null && (
        <SmallBadge variant={candidate.score >= 90 ? 'success' : 'secondary'}>
          Score: {candidate.score}
        </SmallBadge>
      )}
    </div>
  );
}

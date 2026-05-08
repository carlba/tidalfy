import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MusicBrainzCandidateDetails } from '@/components/MusicBrainzCandidateDetails';
import type { MusicBrainzCandidate } from '@/lib/types';

interface MusicBrainzCandidateItemProps {
  candidate: MusicBrainzCandidate;
  savingMbid: string | null;
  onSelect: (candidate: MusicBrainzCandidate) => void | Promise<void>;
}

export function MusicBrainzCandidateItem({
  candidate,
  savingMbid,
  onSelect,
}: MusicBrainzCandidateItemProps) {
  return (
    <div className="flex items-start justify-between gap-3 p-3 hover:bg-muted/50 transition-colors">
      <div className="min-w-0 flex-1 flex gap-3">
        {candidate.releaseCoverArtUrl && (
          <img
            src={candidate.releaseCoverArtUrl}
            alt={`${candidate.releaseTitle ?? 'Release'} cover art`}
            className="h-20 w-20 rounded-md object-cover"
          />
        )}

        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{candidate.title}</p>
          <p className="text-xs text-muted-foreground">{candidate.artistCredit}</p>
          <p className="text-[11px] text-muted-foreground truncate">MBID: {candidate.mbid}</p>
          <MusicBrainzCandidateDetails candidate={candidate} />
        </div>
      </div>

      <Button size="sm" onClick={() => void onSelect(candidate)} disabled={savingMbid !== null}>
        {savingMbid === candidate.mbid ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Select'}
      </Button>
    </div>
  );
}

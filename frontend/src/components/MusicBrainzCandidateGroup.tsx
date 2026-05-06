import { ChevronDown } from 'lucide-react';
import { MusicBrainzCandidateDetails } from '@/components/MusicBrainzCandidateDetails';
import { MusicBrainzCandidateItem } from '@/components/MusicBrainzCandidateItem';
import type { MusicBrainzCandidate } from '@/lib/types';

interface MusicBrainzCandidateGroupProps {
  group: MusicBrainzCandidate[];
  isExpanded: boolean;
  onToggle: () => void;
  savingMbid: string | null;
  onSelect: (candidate: MusicBrainzCandidate) => void;
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

export function MusicBrainzCandidateGroup({
  group,
  isExpanded,
  onToggle,
  savingMbid,
  onSelect,
}: MusicBrainzCandidateGroupProps) {
  const representative = group[0];
  const releaseTitle = getMostCommonReleaseTitle(group);

  if (group.length === 1) {
    return (
      <li className="border-b last:border-b-0">
        <MusicBrainzCandidateItem
          candidate={representative}
          savingMbid={savingMbid}
          onSelect={onSelect}
        />
      </li>
    );
  }

  return (
    <li className="border-b last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 p-3 bg-muted/10 text-sm font-semibold text-foreground"
        aria-expanded={isExpanded}>
        <div className="min-w-0 text-left">
          <p className="truncate">{representative.title}</p>
          <p className="text-xs text-muted-foreground truncate">{representative.artistCredit}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            MBID: {representative.mbid} · {group.length} results
          </p>
          <MusicBrainzCandidateDetails
            candidate={representative}
            showBadges={false}
            releaseTitleOverride={releaseTitle}
          />
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
      </button>

      {isExpanded && (
        <ul className="divide-y divide-border">
          {group.map(candidate => (
            <li
              key={`${candidate.mbid}-${candidate.releaseTitle ?? ''}-${candidate.releaseDate ?? ''}-${candidate.releaseCountry ?? ''}`}
              className="pl-10">
              <MusicBrainzCandidateItem
                candidate={candidate}
                savingMbid={savingMbid}
                onSelect={onSelect}
              />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

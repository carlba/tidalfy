import { DetailText } from '@/components/ui/detail-text';
import { MusicBrainzCandidateBadges } from '@/components/MusicBrainzCandidateBadges';
import type { MusicBrainzCandidate } from '@/lib/types';

interface MusicBrainzCandidateDetailsProps {
  candidate: MusicBrainzCandidate;
  showBadges?: boolean;
  showTypeDetails?: boolean;
  releaseTitleOverride?: string | null;
}

export function MusicBrainzCandidateDetails({
  candidate,
  showBadges = true,
  showTypeDetails = true,
  releaseTitleOverride,
}: MusicBrainzCandidateDetailsProps) {
  const releaseTitle = releaseTitleOverride ?? candidate.releaseTitle;

  return (
    <>
      {releaseTitle && (
        <DetailText>
          {releaseTitle}
          {candidate.releaseDate ? ` · ${candidate.releaseDate}` : ''}
          {candidate.releaseCountry ? ` · ${candidate.releaseCountry}` : ''}
        </DetailText>
      )}
      {candidate.releaseBarcode && <DetailText>UPC/EAN: {candidate.releaseBarcode}</DetailText>}
      {candidate.releasePackaging && (
        <DetailText>Packaging: {candidate.releasePackaging}</DetailText>
      )}
      {candidate.releaseAsin && <DetailText>ASIN: {candidate.releaseAsin}</DetailText>}
      {candidate.releaseStatus && <DetailText>Status: {candidate.releaseStatus}</DetailText>}
      {candidate.releaseHasCoverArt && <DetailText>Cover art available</DetailText>}
      {showTypeDetails && candidate.releaseType && (
        <DetailText>Type: {candidate.releaseType}</DetailText>
      )}
      {showTypeDetails && candidate.releaseSecondaryTypes?.length ? (
        <DetailText>Secondary: {candidate.releaseSecondaryTypes.join(', ')}</DetailText>
      ) : null}
      {showBadges && <MusicBrainzCandidateBadges candidate={candidate} />}
    </>
  );
}

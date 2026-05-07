import { DetailText } from '@/components/ui/detail-text';
import type { DiscogsCandidate } from '@/lib/types';

interface DiscogsCandidateDetailsProps {
  candidate: DiscogsCandidate;
}

export function DiscogsCandidateDetails({ candidate }: DiscogsCandidateDetailsProps) {
  const title = candidate.releaseTitle ?? candidate.title;

  return (
    <>
      {title && (
        <DetailText>
          {title}
          {candidate.releaseDate ? ` · ${candidate.releaseDate}` : ''}
          {candidate.releaseCountry ? ` · ${candidate.releaseCountry}` : ''}
        </DetailText>
      )}
      {candidate.releaseLabel && <DetailText>{candidate.releaseLabel}</DetailText>}
      {candidate.releaseFormat && <DetailText>{candidate.releaseFormat}</DetailText>}
      {candidate.releaseBarcode && <DetailText>EAN: {candidate.releaseBarcode}</DetailText>}
      {candidate.isrc && <DetailText>ISRC: {candidate.isrc}</DetailText>}
    </>
  );
}

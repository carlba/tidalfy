import { DetailText } from '@/components/ui/detail-text';
import type { DiscogsCandidate } from '@/lib/types';

interface DiscogsCandidateDetailsProps {
  candidate: DiscogsCandidate;
}

export function DiscogsCandidateDetails({ candidate }: DiscogsCandidateDetailsProps) {
  const title = candidate.releaseTitle ?? candidate.title;
  const releaseCategory = candidate.isAlbum
    ? 'Album'
    : candidate.isSingle
      ? 'Single'
      : candidate.isCompilation
        ? 'Compilation'
        : candidate.releaseFormat;
  const showReleaseFormat = candidate.releaseFormat && candidate.releaseFormat !== releaseCategory;

  return (
    <>
      {title && (
        <DetailText>
          {title}
          {candidate.releaseDate ? ` · ${candidate.releaseDate}` : ''}
          {candidate.releaseCountry ? ` · ${candidate.releaseCountry}` : ''}
        </DetailText>
      )}
      {candidate.isMaster && <DetailText>Master release</DetailText>}
      {releaseCategory && <DetailText>{releaseCategory}</DetailText>}
      {candidate.releaseLabel && <DetailText>{candidate.releaseLabel}</DetailText>}
      {showReleaseFormat && <DetailText>{candidate.releaseFormat}</DetailText>}
      {candidate.releaseBarcode && <DetailText>EAN: {candidate.releaseBarcode}</DetailText>}
      {candidate.isrc && <DetailText>ISRC: {candidate.isrc}</DetailText>}
    </>
  );
}

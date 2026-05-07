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
      {candidate.isMaster && <DetailText>Master release</DetailText>}
      {candidate.releaseLabel && <DetailText>{candidate.releaseLabel}</DetailText>}
      {candidate.releaseFormat && <DetailText>{candidate.releaseFormat}</DetailText>}
      {candidate.releaseEans.length > 0 && (
        <DetailText>EANs: {candidate.releaseEans.join(', ')}</DetailText>
      )}
      {candidate.releaseBarcodeRaw.length > 0 && (
        <DetailText>Raw EAN(s): {candidate.releaseBarcodeRaw.join(', ')}</DetailText>
      )}
      {candidate.isrc && <DetailText>ISRC: {candidate.isrc}</DetailText>}
    </>
  );
}

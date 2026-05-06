import { describe, expect, it } from 'vitest';
import { selectBestRelease } from './musicbrainz.js';

describe('selectBestRelease', () => {
  const releases = [
    { title: 'Early 2000s Coffee Shop', date: '2025-06-27', country: 'XW', id: '1' },
    { title: 'No Need to Argue', date: '1994-10-03', country: 'US', id: '2' },
    { title: 'No Need to Argue', date: '2020-11-13', country: 'XW', id: '3' },
  ];

  it('prefers the release whose title matches the album name exactly', () => {
    const best = selectBestRelease(releases, 'No Need to Argue');

    expect(best).toEqual({
      title: 'No Need to Argue',
      date: '1994-10-03',
      country: 'US',
      id: '2',
    });
  });

  it('falls back to the earliest release date when the album name is not available', () => {
    const best = selectBestRelease(releases, undefined, '1994-10-18');

    expect(best).toEqual({
      title: 'No Need to Argue',
      date: '1994-10-03',
      country: 'US',
      id: '2',
    });
  });

  it('chooses the earliest exact album match when multiple album reissues exist', () => {
    const reissues = [
      { title: 'No Need to Argue', date: '2025-08-15', country: 'US', id: '3' },
      { title: 'No Need to Argue', date: '1994-10-03', country: 'US', id: '2' },
      { title: 'No Need to Argue', date: '2002-07-30', country: 'US', id: '4' },
    ];

    const best = selectBestRelease(reissues, 'No Need to Argue');

    expect(best).toEqual({
      title: 'No Need to Argue',
      date: '1994-10-03',
      country: 'US',
      id: '2',
    });
  });
});

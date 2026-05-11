import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../registry.js', () => ({
  config: {
    DISCOGS_USER_TOKEN: 'fake-token',
    NODE_ENV: 'test',
  },
}));

let extractEanCandidates: typeof import('./discogs.js').extractEanCandidates;
let normalizeDiscogsBarcode: typeof import('./discogs.js').normalizeDiscogsBarcode;
let parseDiscogsArtistAndTitle: typeof import('./discogs.js').parseDiscogsArtistAndTitle;

beforeAll(async () => {
  ({ extractEanCandidates, normalizeDiscogsBarcode, parseDiscogsArtistAndTitle } =
    await import('./discogs.js'));
});

describe('Discogs barcode normalization', () => {
  it('extracts only 13-digit EAN values from a raw string', () => {
    const raw = '0123456789012, 123456789012; 000111222333 | ABC123';
    expect(extractEanCandidates(raw)).toEqual(['0123456789012', '0123456789012', '0000111222333']);
  });

  it('converts 12-digit UPC values to 13-digit EAN values', () => {
    const raw = '123456789012';
    expect(extractEanCandidates(raw)).toEqual(['0123456789012']);
  });

  it('returns a normalized primary barcode and full list', () => {
    const result = normalizeDiscogsBarcode(['123456789012', '000111222333']);
    expect(result).toEqual({
      primary: '0123456789012',
      all: ['0123456789012', '0000111222333'],
    });
  });
});

describe('Discogs title parsing', () => {
  it('splits an artist and release title from Discogs search title', () => {
    expect(parseDiscogsArtistAndTitle('Radiohead - OK Computer')).toEqual({
      artist: 'Radiohead',
      releaseTitle: 'OK Computer',
    });
  });

  it('returns null artist for titles without a separator', () => {
    expect(parseDiscogsArtistAndTitle('OK Computer')).toEqual({
      artist: null,
      releaseTitle: 'OK Computer',
    });
  });
});

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const moduleLogger = { debug: vi.fn(), warn: vi.fn() };
const registryLogger = { child: vi.fn(() => moduleLogger) };
const mockGet = vi.fn();

vi.mock('../registry.js', () => ({
  config: { isDevelopment: false, NODE_ENV: 'test' },
  LOGGER: registryLogger,
}));

vi.mock('got', () => ({
  __esModule: true,
  default: {
    extend: vi.fn(() => ({ get: mockGet })),
  },
}));

let selectBestRelease: typeof import('./musicbrainz.js').selectBestRelease;
let searchMusicBrainz: typeof import('./musicbrainz.js').searchMusicBrainz;

beforeAll(async () => {
  ({ selectBestRelease, searchMusicBrainz } = await import('./musicbrainz.js'));
});

beforeEach(() => {
  mockGet.mockReset();
});

describe('searchMusicBrainz', () => {
  it('builds a MusicBrainz recording+artist query for recording search', async () => {
    const mockJson = vi.fn().mockResolvedValue({
      recordings: [
        {
          id: '271e1806-c846-4476-8914-b0ffbeaed4d3',
          title: 'Instrumental (Crimson Tide / Deep Blue Sea) - Live at Pakkahuone',
          score: 100,
          'artist-credit': [{ artist: { id: '1', name: 'Nightwish' }, name: 'Nightwish' }],
          releases: [
            {
              id: 'release-1',
              title: 'Live at Pakkahuone',
              status: 'Official',
              'release-group': { 'primary-type': 'Album' },
            },
          ],
        },
      ],
    });

    mockGet.mockReturnValue({ json: mockJson });

    const results = await searchMusicBrainz(
      'Instrumental (Crimson Tide / Deep Blue Sea) - Live at Pakkahuone',
      'Nightwish',
      undefined,
      undefined,
      false,
      false,
      true
    );

    expect(mockGet).toHaveBeenCalled();
    const [path, options] = mockGet.mock.calls[0] as [
      string,
      { searchParams: Record<string, string> },
    ];
    expect(path).toBe('recording');
    expect(options.searchParams.query).toBe(
      'recording:"Instrumental (Crimson Tide / Deep Blue Sea)" AND artist:Nightwish'
    );
    expect(results).toEqual([
      expect.objectContaining({
        mbid: '271e1806-c846-4476-8914-b0ffbeaed4d3',
        title: 'Instrumental (Crimson Tide / Deep Blue Sea) - Live at Pakkahuone',
        artistCredit: 'Nightwish',
      }),
    ]);
  });

  it('builds a MusicBrainz recording-only query when artist filter is disabled', async () => {
    const mockJson = vi.fn().mockResolvedValue({
      recordings: [
        {
          id: 'abc123',
          title: 'Pop opp i topp (feat. Lill-Babs)',
          score: 100,
          'artist-credit': [{ artist: { id: '2', name: 'Hidden Artist' }, name: 'Hidden Artist' }],
          releases: [
            {
              id: 'release-2',
              title: 'Some Release',
              status: 'Official',
              'release-group': { 'primary-type': 'Album' },
            },
          ],
        },
      ],
    });

    mockGet.mockReturnValue({ json: mockJson });

    const results = await searchMusicBrainz(
      'Pop opp i topp (feat. Lill-Babs)',
      '',
      undefined,
      undefined,
      false,
      false,
      true
    );

    expect(mockGet).toHaveBeenCalled();
    const [path, options] = mockGet.mock.calls[0] as [
      string,
      { searchParams: Record<string, string> },
    ];
    expect(path).toBe('recording');
    expect(options.searchParams.query).toBe('recording:"Pop opp i topp (feat. Lill-Babs)"');
    expect(results).toEqual([
      expect.objectContaining({
        mbid: 'abc123',
        title: 'Pop opp i topp (feat. Lill-Babs)',
      }),
    ]);
  });

  it('builds an artist-only query when title search is disabled', async () => {
    const mockJson = vi.fn().mockResolvedValue({
      recordings: [
        {
          id: 'artist-only-1',
          title: 'Another Song',
          score: 100,
          'artist-credit': [{ artist: { id: '3', name: 'Nightwish' }, name: 'Nightwish' }],
          releases: [
            {
              id: 'release-3',
              title: 'Some Release',
              status: 'Official',
              'release-group': { 'primary-type': 'Album' },
            },
          ],
        },
      ],
    });

    mockGet.mockReturnValue({ json: mockJson });

    const results = await searchMusicBrainz(
      '',
      'Nightwish',
      undefined,
      undefined,
      false,
      false,
      true
    );

    expect(mockGet).toHaveBeenCalled();
    const [path, options] = mockGet.mock.calls[0] as [
      string,
      { searchParams: Record<string, string> },
    ];
    expect(path).toBe('recording');
    expect(options.searchParams.query).toBe('artist:Nightwish');
    expect(results).toEqual([
      expect.objectContaining({
        mbid: 'artist-only-1',
        title: 'Another Song',
      }),
    ]);
  });

  it('builds a release-only query when only album filter is present', async () => {
    const mockJson = vi.fn().mockResolvedValue({
      recordings: [
        {
          id: 'album-only-1',
          title: 'Some Track',
          score: 100,
          'artist-credit': [
            { artist: { id: '4', name: 'Unknown Artist' }, name: 'Unknown Artist' },
          ],
          releases: [
            {
              id: 'release-4',
              title: 'The Wrong Kind of War',
              status: 'Official',
              'release-group': { 'primary-type': 'Album' },
            },
          ],
        },
      ],
    });

    mockGet.mockReturnValue({ json: mockJson });

    const results = await searchMusicBrainz(
      '',
      '',
      'The Wrong Kind of War',
      undefined,
      false,
      false,
      true
    );

    expect(mockGet).toHaveBeenCalled();
    const [path, options] = mockGet.mock.calls[0] as [
      string,
      { searchParams: Record<string, string> },
    ];
    expect(path).toBe('recording');
    expect(options.searchParams.query).toBe('release:"The Wrong Kind of War"');
    expect(results).toEqual([
      expect.objectContaining({
        mbid: 'album-only-1',
        title: 'Some Track',
      }),
    ]);
  });
});

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

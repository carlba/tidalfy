import { describe, expect, it } from 'vitest';
import { parseSpotifyCsv } from './csv-parser.js';

const VALID_HEADER =
  'Track URI,Track Name,Album Name,Artist Name(s),Release Date,Duration (ms),Popularity,Explicit,Added By,Added At,Genres,Record Label,Danceability,Energy,Key,Loudness,Mode,Speechiness,Acousticness,Instrumentalness,Liveness,Valence,Tempo,Time Signature';

const VALID_ROW =
  'spotify:track:2cKCSngj4rdMI9K1deFJOe,"Rockstar","All the Right Reasons","Nickelback",2005-09-26,255520,55,false,,1970-01-01T00:00:00Z,"post-grunge,rock","Roadrunner Records",0.618,0.908,0,-3.369,1,0.0402,0.0522,0,0.313,0.712,144.081,4';

describe('parseSpotifyCsv', () => {
  it('parses a valid CSV row into a SpotifyTrackRow', () => {
    const csv = [VALID_HEADER, VALID_ROW].join('\n');
    const { valid, errors } = parseSpotifyCsv(csv);

    expect(errors).toHaveLength(0);
    expect(valid).toHaveLength(1);

    const track = valid[0];
    expect(track['Track URI']).toBe('spotify:track:2cKCSngj4rdMI9K1deFJOe');
    expect(track['Track Name']).toBe('Rockstar');
    expect(track['Artist Name(s)']).toBe('Nickelback');
    expect(track['Duration (ms)']).toBe(255520);
    expect(track.Explicit).toBe(false);
    expect(track.Popularity).toBe(55);
  });

  it('returns an error for a row missing the Track URI', () => {
    const badRow =
      'not-a-uri,"Bad Track","Album","Artist",2020-01-01,12345,50,false,,,,"Label",0,0,0,0,0,0,0,0,0,0,0,0';
    const csv = [VALID_HEADER, badRow].join('\n');
    const { valid, errors } = parseSpotifyCsv(csv);

    expect(valid).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].row).toBe(1);
  });

  it('returns an error for CSV with no data rows', () => {
    const { errors } = parseSpotifyCsv(VALID_HEADER);
    expect(errors[0].message).toMatch(/no data rows/i);
  });

  it('returns an error for CSV missing required columns', () => {
    const { errors } = parseSpotifyCsv('Col1,Col2\nval1,val2');
    expect(errors[0].message).toMatch(/missing required column/i);
  });

  it('separates valid and invalid rows in a mixed CSV', () => {
    const badRow =
      'bad-uri,"Title","Album","Artist",2020,1000,50,true,,,,"Label",0,0,0,0,0,0,0,0,0,0,0,0';
    const csv = [VALID_HEADER, VALID_ROW, badRow].join('\n');
    const { valid, errors } = parseSpotifyCsv(csv);

    expect(valid).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(errors[0].row).toBe(2);
  });
});

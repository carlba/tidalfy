import { useEffect, useState } from 'react';
import { Music, ListMusic, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ImportUpload } from '@/components/ImportUpload';
import { TrackList } from '@/components/TrackList';
import { MusicBrainzDialog } from '@/components/MusicBrainzDialog';
import { DiscogsDialog } from '@/components/DiscogsDialog';
import { BatchList } from '@/components/BatchList';
import { StatusTabs } from '@/components/StatusTabs';
import {
  archiveTrack,
  fetchBatches,
  fetchTracks,
  type TrackStatus,
  unarchiveTrack,
} from '@/lib/api';
import type {
  DiscogsMatch,
  ImportBatch,
  ImportResult,
  MusicBrainzCandidate,
  Track,
} from '@/lib/types';

export function App() {
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [trackStatus, setTrackStatus] = useState<TrackStatus>('active');
  const [activeMatchTrack, setActiveMatchTrack] = useState<Track | null>(null);
  const [activeDiscogsTrack, setActiveDiscogsTrack] = useState<Track | null>(null);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [showUnmatchedOnly, setShowUnmatchedOnly] = useState(false);
  const [importErrors, setImportErrors] = useState<ImportResult['errors']>([]);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    void fetchBatches().then(setBatches).catch(console.error);
  }, []);

  async function loadTracks(batchId?: string, status: TrackStatus = trackStatus) {
    setIsLoadingTracks(true);
    try {
      const data = await fetchTracks(batchId, status);
      setTracks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingTracks(false);
    }
  }

  function handleBatchSelect(batchId: string) {
    setSelectedBatchId(batchId);
    setShowImport(false);
    void loadTracks(batchId);
  }

  function handleStatusChange(status: TrackStatus) {
    setTrackStatus(status);
    void loadTracks(selectedBatchId ?? undefined, status);
  }

  function handleImportSuccess(result: ImportResult) {
    setImportErrors(result.errors);
    setShowImport(false);
    void fetchBatches()
      .then(updated => {
        setBatches(updated);
        handleBatchSelect(result.batchId);
      })
      .catch(console.error);
  }

  function handleMatchSaved(trackId: string, candidate: MusicBrainzCandidate) {
    const artistCredit = candidate.artistCredit
      .split(/\s*(?:,|&|\/)\s*/)
      .map(name => name.trim())
      .filter(Boolean);

    setTracks(prev =>
      prev.map(track =>
        track.id === trackId
          ? {
              ...track,
              match: { ...candidate, artistCredit, selectedAt: new Date().toISOString() },
            }
          : track
      )
    );

    if (selectedBatchId !== null) {
      void loadTracks(selectedBatchId, trackStatus);
    }
  }

  function handleDiscogsSaved(trackId: string, candidate: DiscogsMatch) {
    setTracks(prev =>
      prev.map(track =>
        track.id === trackId
          ? { ...track, discogsMatch: { ...candidate, selectedAt: new Date().toISOString() } }
          : track
      )
    );
  }

  async function handleArchiveTrack(track: Track) {
    try {
      if (track.archived) {
        await unarchiveTrack(track.id);
      } else {
        await archiveTrack(track.id);
      }

      setTracks(prev =>
        trackStatus === 'all'
          ? prev.map(t => (t.id === track.id ? { ...t, archived: !t.archived } : t))
          : prev.filter(t => t.id !== track.id)
      );
    } catch (err) {
      console.error(err);
    }
  }

  const matchedCount = tracks.filter(t => t.match !== null || t.discogsMatch !== null).length;
  const displayedTracks = showUnmatchedOnly
    ? tracks.filter(t => t.match === null && t.discogsMatch === null)
    : tracks;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" />
            <span className="font-semibold text-lg">Tidalfy</span>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setShowImport(true);
              setSelectedBatchId(null);
              setTracks([]);
            }}>
            <Upload className="h-4 w-4 mr-1" />
            Import CSV
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ListMusic className="h-4 w-4" />
                  Import Batches
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <BatchList
                  batches={batches}
                  selectedBatchId={selectedBatchId}
                  onSelect={handleBatchSelect}
                />
              </CardContent>
            </Card>
          </aside>

          <div className="lg:col-span-3 space-y-4">
            {showImport || batches.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Import Spotify CSV</CardTitle>
                </CardHeader>
                <CardContent>
                  <ImportUpload onImportSuccess={handleImportSuccess} />
                </CardContent>
              </Card>
            ) : (
              <>
                {selectedBatchId !== null && (
                  <StatusTabs value={trackStatus} onChange={handleStatusChange} />
                )}

                {selectedBatchId !== null && tracks.length > 0 && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="secondary">{tracks.length} tracks</Badge>
                    <Badge variant="success">{matchedCount} matched</Badge>
                    {tracks.length - matchedCount > 0 && (
                      <Badge variant="outline">{tracks.length - matchedCount} unmatched</Badge>
                    )}
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={showUnmatchedOnly}
                        onChange={event => setShowUnmatchedOnly(event.target.checked)}
                        className="h-4 w-4 rounded border-muted-foreground accent-primary focus:ring-primary"
                      />
                      Show only unmatched
                    </label>
                  </div>
                )}

                {importErrors.length > 0 && (
                  <Card className="border-amber-300 bg-amber-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-amber-700">
                        {importErrors.length} row{importErrors.length > 1 ? 's' : ''} failed to
                        import
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {importErrors.map((err, idx) => (
                          <li key={idx} className="text-xs text-amber-700">
                            Row {err.row}: {err.message}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Tracks</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {isLoadingTracks ? (
                      <div className="py-12 text-center text-sm text-muted-foreground">
                        Loading tracks…
                      </div>
                    ) : (
                      <TrackList
                        tracks={displayedTracks}
                        onSearchMatch={setActiveMatchTrack}
                        onSearchDiscogs={setActiveDiscogsTrack}
                        onArchive={handleArchiveTrack}
                        emptyMessage={
                          showUnmatchedOnly
                            ? 'No unmatched tracks found.'
                            : trackStatus === 'archived'
                              ? 'No archived tracks yet.'
                              : trackStatus === 'all'
                                ? 'No tracks found.'
                                : 'No active tracks yet.'
                        }
                      />
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </main>

      <MusicBrainzDialog
        key={`mb-${activeMatchTrack?.id ?? 'empty'}`}
        track={activeMatchTrack}
        onClose={() => setActiveMatchTrack(null)}
        onMatchSaved={handleMatchSaved}
      />
      <DiscogsDialog
        key={`discogs-${activeDiscogsTrack?.id ?? 'empty'}`}
        track={activeDiscogsTrack}
        onClose={() => setActiveDiscogsTrack(null)}
        onMatchSaved={handleDiscogsSaved}
      />
    </div>
  );
}

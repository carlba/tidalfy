import { useEffect, useState } from "react";
import { Music, ListMusic, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ImportUpload } from "@/components/ImportUpload";
import { TrackList } from "@/components/TrackList";
import { MusicBrainzDialog } from "@/components/MusicBrainzDialog";
import { fetchBatches, fetchTracks } from "@/lib/api";
import type { ImportBatch, ImportResult, MusicBrainzCandidate, Track } from "@/lib/types";

export function App() {
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [activeMatchTrack, setActiveMatchTrack] = useState<Track | null>(null);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [importErrors, setImportErrors] = useState<ImportResult["errors"]>([]);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    fetchBatches().then(setBatches).catch(console.error);
  }, []);

  async function loadTracks(batchId?: string) {
    setIsLoadingTracks(true);
    try {
      const data = await fetchTracks(batchId);
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
    loadTracks(batchId);
  }

  function handleImportSuccess(result: ImportResult) {
    setImportErrors(result.errors);
    setShowImport(false);
    fetchBatches().then(updated => {
      setBatches(updated);
      handleBatchSelect(result.batchId);
    }).catch(console.error);
  }

  function handleMatchSaved(trackId: string, candidate: MusicBrainzCandidate) {
    setTracks(prev =>
      prev.map(t =>
        t.id === trackId
          ? { ...t, match: { ...candidate, selectedAt: new Date().toISOString() } }
          : t
      )
    );
  }

  const matchedCount = tracks.filter(t => t.match !== null).length;

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
            }}
          >
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
                {batches.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-4 pb-4">No imports yet.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {batches.map(batch => (
                      <li key={batch.id}>
                        <button
                          className={
                            "w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors " +
                            (selectedBatchId === batch.id ? "bg-muted font-medium" : "")
                          }
                          onClick={() => handleBatchSelect(batch.id)}
                        >
                          <p className="text-sm truncate">{batch.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {batch.trackCount} tracks &middot; {new Date(batch.importedAt).toLocaleDateString()}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
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
                {selectedBatchId !== null && tracks.length > 0 && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="secondary">{tracks.length} tracks</Badge>
                    <Badge variant="success">{matchedCount} matched</Badge>
                    {tracks.length - matchedCount > 0 && (
                      <Badge variant="outline">{tracks.length - matchedCount} unmatched</Badge>
                    )}
                  </div>
                )}

                {importErrors.length > 0 && (
                  <Card className="border-amber-300 bg-amber-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-amber-700">
                        {importErrors.length} row{importErrors.length > 1 ? "s" : ""} failed to import
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
                      <TrackList tracks={tracks} onSearchMatch={setActiveMatchTrack} />
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </main>

      <MusicBrainzDialog
        track={activeMatchTrack}
        onClose={() => setActiveMatchTrack(null)}
        onMatchSaved={handleMatchSaved}
      />
    </div>
  );
}

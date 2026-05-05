import { useRef, useState } from 'react';
import { Upload, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uploadCsv } from '@/lib/api';
import type { ImportResult } from '@/lib/types';

interface ImportUploadProps {
  onImportSuccess: (result: ImportResult) => void;
}

export function ImportUpload({ onImportSuccess }: ImportUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  async function handleFile(file: File) {
    if (!file.name.endsWith('.csv')) {
      setError('Please select a CSV file exported from Spotify.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await uploadCsv(file);
      onImportSuccess(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsLoading(false);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="space-y-3">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
        }`}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}>
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <FileText className="h-10 w-10" />
          <p className="text-sm font-medium">Drop your Spotify CSV here, or click to browse</p>
          <p className="text-xs">Exported from Spotify — tracks with metadata</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={() => inputRef.current?.click()} disabled={isLoading} className="w-full">
        <Upload className="h-4 w-4 mr-2" />
        {isLoading ? 'Importing…' : 'Select CSV file'}
      </Button>
    </div>
  );
}

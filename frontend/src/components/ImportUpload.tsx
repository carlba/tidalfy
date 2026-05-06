import { useState } from 'react';
import { uploadCsv } from '@/lib/api';
import type { ImportResult } from '@/lib/types';
import { FileDropZone } from '@/components/FileDropZone';

interface ImportUploadProps {
  onImportSuccess: (result: ImportResult) => void;
}

export function ImportUpload({ onImportSuccess }: ImportUploadProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <FileDropZone
      accept=".csv"
      label="Drop your Spotify CSV here, or click to browse"
      description="Exported from Spotify — tracks with metadata"
      helperText="Only .csv files are accepted"
      buttonLabel="Select CSV file"
      error={error}
      loading={isLoading}
      disabled={isLoading}
      onFile={handleFile}
    />
  );
}

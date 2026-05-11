import { useRef, useState, type DragEvent } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FileDropZoneProps {
  accept: string;
  label: string;
  description?: string;
  helperText?: string;
  buttonLabel?: string;
  error?: string | null;
  loading?: boolean;
  disabled?: boolean;
  onFile: (file: File) => void | Promise<void>;
}

export function FileDropZone({
  accept,
  label,
  description,
  helperText,
  buttonLabel = 'Select file',
  error,
  loading = false,
  disabled = false,
  onFile,
}: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleFile(file: File) {
    void onFile(file);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
        )}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={event => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}>
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Upload className="h-10 w-10" />
          <p className="text-sm font-medium">{label}</p>
          {description && <p className="text-xs">{description}</p>}
        </div>
      </div>

      {helperText && <p className="text-sm text-muted-foreground">{helperText}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        onClick={() => inputRef.current?.click()}
        disabled={disabled || loading}
        className="w-full">
        <Upload className="h-4 w-4 mr-2" />
        {loading ? `${buttonLabel}…` : buttonLabel}
      </Button>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={event => {
          const file = event.target.files?.[0];
          if (file) {
            handleFile(file);
          }
        }}
      />
    </div>
  );
}

'use client';

import { useState, useRef } from 'react';
import { Upload, X, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui';

interface CsvImportModalProps {
  restaurantId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CsvImportModal({ restaurantId, onClose, onSuccess }: CsvImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    total: number;
    skipped: number;
    duplicates: number;
    capped?: number;
    capMessage?: string;
    errors: string[];
  } | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        setError('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      setError('');
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(
        `/api/dashboard/marketing/contacts/import?restaurant_id=${restaurantId}`,
        { method: 'POST', body: formData }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Import failed');
        return;
      }

      setResult(data);
      onSuccess();
    } catch {
      setError('Failed to upload CSV');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-tastelanc-text-primary">Import Contacts</h3>
          <button onClick={onClose} className="text-tastelanc-text-muted hover:text-tastelanc-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!result ? (
          <>
            <p className="text-sm text-tastelanc-text-muted mb-4">
              Upload a CSV file with at least an &ldquo;email&rdquo; column. An optional &ldquo;name&rdquo; column will also be imported.
            </p>

            <div
              className="border-2 border-dashed border-tastelanc-border rounded-lg p-8 text-center cursor-pointer hover:border-tastelanc-border transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="w-8 h-8 text-tastelanc-accent" />
                  <div className="text-left">
                    <p className="text-tastelanc-text-primary text-sm font-medium">{file.name}</p>
                    <p className="text-tastelanc-text-faint text-xs">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-tastelanc-text-faint mx-auto mb-2" />
                  <p className="text-tastelanc-text-muted text-sm">Click to select CSV file</p>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />

            {error && (
              <p className="text-red-400 text-sm mt-3">{error}</p>
            )}

            <div className="flex gap-3 mt-6">
              <Button
                onClick={onClose}
                className="flex-1 bg-tastelanc-surface hover:bg-tastelanc-surface-light text-tastelanc-text-primary"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="flex-1 bg-tastelanc-accent hover:bg-tastelanc-accent/80 text-white disabled:opacity-50"
              >
                {uploading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing...
                  </span>
                ) : (
                  'Import'
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <p className="text-green-400 font-medium">
                  {result.imported} contacts imported
                </p>
              </div>
              {result.skipped > 0 && (
                <p className="text-sm text-tastelanc-text-muted">
                  {result.skipped} rows skipped (missing email)
                </p>
              )}
              {result.capped && result.capped > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                  <p className="text-yellow-400 text-sm">
                    {result.capMessage || `${result.capped} contacts skipped due to tier limit`}
                  </p>
                </div>
              )}
              {result.errors.length > 0 && (
                <div className="text-sm text-yellow-400">
                  <p className="font-medium mb-1">{result.errors.length} errors:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    {result.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <Button
              onClick={onClose}
              className="w-full mt-6 bg-tastelanc-accent hover:bg-tastelanc-accent/80 text-white"
            >
              Done
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

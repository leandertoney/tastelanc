'use client';

import { X, Paperclip, FileText, ImageIcon, FileSpreadsheet, File, Download, Loader2 } from 'lucide-react';
import type { EmailAttachment } from '@/lib/types/attachments';
import { formatFileSize } from '@/lib/types/attachments';

function getFileIcon(contentType: string) {
  if (contentType.startsWith('image/')) return 'image';
  if (contentType === 'application/pdf') return 'pdf';
  if (contentType.includes('word') || contentType.includes('document')) return 'doc';
  if (contentType.includes('excel') || contentType.includes('spreadsheet') || contentType === 'text/csv') return 'sheet';
  return 'file';
}

function AttachmentIcon({ type, className }: { type: string; className?: string }) {
  const icon = getFileIcon(type);
  const cn = className || 'w-3 h-3';
  switch (icon) {
    case 'image': return <ImageIcon className={cn} />;
    case 'pdf': return <FileText className={cn} />;
    case 'doc': return <FileText className={cn} />;
    case 'sheet': return <FileSpreadsheet className={cn} />;
    default: return <File className={cn} />;
  }
}

interface EditableAttachmentChipsProps {
  attachments: EmailAttachment[];
  onRemove: (index: number) => void;
  isUploading?: boolean;
}

export function EditableAttachmentChips({ attachments, onRemove, isUploading }: EditableAttachmentChipsProps) {
  if (attachments.length === 0 && !isUploading) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {isUploading && (
        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600/10 text-blue-400 text-xs rounded-full">
          <Loader2 className="w-3 h-3 animate-spin" />
          Uploading...
        </span>
      )}
      {attachments.map((att, i) => (
        <span
          key={`${att.filename}-${i}`}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-tastelanc-surface-light rounded-full text-xs text-tastelanc-text-secondary"
        >
          <AttachmentIcon type={att.contentType} className="w-3 h-3 text-tastelanc-text-muted" />
          <span className="truncate max-w-[120px]">{att.filename}</span>
          <span className="text-tastelanc-text-faint">{formatFileSize(att.size)}</span>
          <button
            onClick={() => onRemove(i)}
            className="ml-0.5 p-0.5 text-tastelanc-text-faint hover:text-red-400 transition-colors"
            title="Remove"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
    </div>
  );
}

interface ReadonlyAttachmentChipsProps {
  attachments: Array<{ url?: string; filename: string; size: number; contentType?: string; content_type?: string }>;
}

export function ReadonlyAttachmentChips({ attachments }: ReadonlyAttachmentChipsProps) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2 pt-1.5 border-t border-white/5">
      <Paperclip className="w-3 h-3 text-tastelanc-text-faint mt-0.5" />
      {attachments.map((att, i) => {
        const type = att.contentType || att.content_type || 'application/octet-stream';
        return att.url ? (
          <a
            key={`${att.filename}-${i}`}
            href={att.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-0.5 bg-tastelanc-surface-light rounded text-xs text-tastelanc-text-secondary hover:text-tastelanc-text-primary hover:bg-tastelanc-surface-light/80 transition-colors"
          >
            <AttachmentIcon type={type} className="w-3 h-3" />
            <span className="truncate max-w-[100px]">{att.filename}</span>
            <Download className="w-2.5 h-2.5 text-tastelanc-text-faint" />
          </a>
        ) : (
          <span
            key={`${att.filename}-${i}`}
            className="flex items-center gap-1 px-2 py-0.5 bg-tastelanc-surface-light rounded text-xs text-tastelanc-text-muted"
          >
            <AttachmentIcon type={type} className="w-3 h-3" />
            <span className="truncate max-w-[100px]">{att.filename}</span>
          </span>
        );
      })}
    </div>
  );
}

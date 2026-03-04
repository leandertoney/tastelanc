'use client';

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import type { EmailAttachment } from '@/lib/types/attachments';
import { MAX_FILE_SIZE, MAX_TOTAL_SIZE, formatFileSize } from '@/lib/types/attachments';

export function useFileAttachments() {
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments([]);
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';

    // Validate total size including existing
    const existingSize = attachments.reduce((sum, a) => sum + a.size, 0);
    const newSize = files.reduce((sum, f) => sum + f.size, 0);
    if (existingSize + newSize > MAX_TOTAL_SIZE) {
      toast.error(`Total attachments cannot exceed ${formatFileSize(MAX_TOTAL_SIZE)}`);
      return;
    }

    setIsUploading(true);

    const uploaded: EmailAttachment[] = [];
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`"${file.name}" exceeds ${formatFileSize(MAX_FILE_SIZE)} limit`);
        continue;
      }

      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/sales/inbox/attachments', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error || `Failed to upload "${file.name}"`);
          continue;
        }

        const data: EmailAttachment = await res.json();
        uploaded.push(data);
      } catch {
        toast.error(`Failed to upload "${file.name}"`);
      }
    }

    if (uploaded.length > 0) {
      setAttachments(prev => [...prev, ...uploaded]);
      toast.success(`${uploaded.length} file${uploaded.length > 1 ? 's' : ''} attached`);
    }

    setIsUploading(false);
  }, [attachments]);

  return {
    attachments,
    isUploading,
    openFilePicker,
    removeAttachment,
    clearAttachments,
    fileInputRef,
    handleFileChange,
  };
}

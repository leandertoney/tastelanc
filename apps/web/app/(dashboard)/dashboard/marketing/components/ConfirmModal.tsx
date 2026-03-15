'use client';

import { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui';

interface ConfirmModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description?: string;
  details?: { label: string; value: string }[];
  warning?: string;
  confirmLabel?: string;
  confirmLoading?: boolean;
  variant?: 'danger' | 'default';
}

export default function ConfirmModal({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  details,
  warning,
  confirmLabel = 'Confirm',
  confirmLoading = false,
  variant = 'default',
}: ConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      cancelRef.current?.focus();
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onCancel();
      };
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative bg-tastelanc-surface-light border border-tastelanc-border rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              variant === 'danger'
                ? 'bg-red-500/15'
                : 'bg-tastelanc-accent/15'
            }`}>
              <AlertTriangle className={`w-5 h-5 ${
                variant === 'danger' ? 'text-red-400' : 'text-tastelanc-accent'
              }`} />
            </div>
            <h3 className="text-tastelanc-text-primary font-semibold text-base">
              {title}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="text-tastelanc-text-faint hover:text-tastelanc-text-muted transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-3 space-y-3">
          {description && (
            <p className="text-sm text-tastelanc-text-muted">{description}</p>
          )}

          {details && details.length > 0 && (
            <div className="bg-tastelanc-bg rounded-lg p-3 space-y-2">
              {details.map((detail, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-tastelanc-text-faint">{detail.label}</span>
                  <span className="text-tastelanc-text-primary font-medium text-right max-w-[60%] truncate">
                    {detail.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {warning && (
            <p className="text-xs text-red-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              {warning}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-5 pb-5 pt-2">
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={confirmLoading}
            className="px-4 py-2 text-sm text-tastelanc-text-muted hover:text-tastelanc-text-primary transition-colors rounded-lg hover:bg-tastelanc-surface disabled:opacity-50"
          >
            Cancel
          </button>
          <Button
            onClick={onConfirm}
            disabled={confirmLoading}
            className={`${
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-tastelanc-accent hover:bg-tastelanc-accent/80'
            } text-white disabled:opacity-50`}
          >
            {confirmLoading ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sending...
              </span>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

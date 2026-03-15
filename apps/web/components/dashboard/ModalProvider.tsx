'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AlertTriangle, CheckCircle, XCircle, X } from 'lucide-react';
import { Button } from '@/components/ui';

// --- Confirm Modal Types ---
interface ConfirmOptions {
  title: string;
  description?: string;
  details?: { label: string; value: string }[];
  warning?: string;
  confirmLabel?: string;
  variant?: 'danger' | 'default';
}

// --- Alert Modal Types ---
interface AlertOptions {
  type: 'success' | 'error';
  text: string;
}

interface ModalContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: AlertOptions) => void;
}

const ModalContext = createContext<ModalContextType | null>(null);

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be used within ModalProvider');
  return ctx;
}

export function ModalProvider({ children }: { children: React.ReactNode }) {
  // Confirm state
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { open: boolean }) | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  // Alert state
  const [alertState, setAlertState] = useState<AlertOptions | null>(null);

  const confirmFn = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setConfirmState({ ...options, open: true });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true);
    resolveRef.current = null;
    setConfirmState(null);
  }, []);

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false);
    resolveRef.current = null;
    setConfirmState(null);
  }, []);

  const alertFn = useCallback((options: AlertOptions) => {
    setAlertState(options);
  }, []);

  return (
    <ModalContext.Provider value={{ confirm: confirmFn, alert: alertFn }}>
      {children}

      {/* Confirm Modal */}
      {confirmState?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCancel} />
          <div className="relative bg-tastelanc-surface-light border border-tastelanc-border rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-2">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  confirmState.variant === 'danger' ? 'bg-red-500/15' : 'bg-tastelanc-accent/15'
                }`}>
                  <AlertTriangle className={`w-5 h-5 ${
                    confirmState.variant === 'danger' ? 'text-red-400' : 'text-tastelanc-accent'
                  }`} />
                </div>
                <h3 className="text-tastelanc-text-primary font-semibold text-base">
                  {confirmState.title}
                </h3>
              </div>
              <button onClick={handleCancel} className="text-tastelanc-text-faint hover:text-tastelanc-text-muted transition-colors p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-3 space-y-3">
              {confirmState.description && (
                <p className="text-sm text-tastelanc-text-muted">{confirmState.description}</p>
              )}
              {confirmState.details && confirmState.details.length > 0 && (
                <div className="bg-tastelanc-bg rounded-lg p-3 space-y-2">
                  {confirmState.details.map((detail, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-tastelanc-text-faint">{detail.label}</span>
                      <span className="text-tastelanc-text-primary font-medium text-right max-w-[60%] truncate">
                        {detail.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {confirmState.warning && (
                <p className="text-xs text-red-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  {confirmState.warning}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-5 pb-5 pt-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm text-tastelanc-text-muted hover:text-tastelanc-text-primary transition-colors rounded-lg hover:bg-tastelanc-surface"
              >
                Cancel
              </button>
              <Button
                onClick={handleConfirm}
                className={`${
                  confirmState.variant === 'danger'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-tastelanc-accent hover:bg-tastelanc-accent/80'
                } text-white`}
              >
                {confirmState.confirmLabel || 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Alert/Result Modal */}
      {alertState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAlertState(null)} />
          <div className="relative bg-tastelanc-surface-light border border-tastelanc-border rounded-xl shadow-2xl max-w-sm w-full mx-4 p-6 text-center">
            {alertState.type === 'success' ? (
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            ) : (
              <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            )}
            <p className="text-tastelanc-text-primary font-medium mb-4">{alertState.text}</p>
            <Button
              onClick={() => setAlertState(null)}
              className="bg-tastelanc-accent hover:bg-tastelanc-accent/80 text-white"
            >
              OK
            </Button>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}

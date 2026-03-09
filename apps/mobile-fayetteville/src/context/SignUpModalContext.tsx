import { useState, useCallback, ReactNode } from 'react';
import { SignUpModal } from '../components';
import { SignUpModalContext } from '@tastelanc/mobile-shared/src/context/SignUpModalContext';

// Re-export the shared hook so existing imports work
export { useSignUpModal } from '@tastelanc/mobile-shared/src/context/SignUpModalContext';

interface SignUpModalProviderProps {
  children: ReactNode;
}

export function SignUpModalProvider({ children }: SignUpModalProviderProps) {
  const [visible, setVisible] = useState(false);
  const [action, setAction] = useState('save your favorites');
  const [onSuccessCallback, setOnSuccessCallback] = useState<(() => void) | null>(null);

  const showSignUpModal = useCallback((options?: { action?: string; onSuccess?: () => void }) => {
    if (options?.action) {
      setAction(options.action);
    }
    if (options?.onSuccess) {
      setOnSuccessCallback(() => options.onSuccess);
    }
    setVisible(true);
  }, []);

  const hideSignUpModal = useCallback(() => {
    setVisible(false);
    setOnSuccessCallback(null);
  }, []);

  const handleSuccess = useCallback(() => {
    if (onSuccessCallback) {
      onSuccessCallback();
    }
    hideSignUpModal();
  }, [onSuccessCallback, hideSignUpModal]);

  return (
    <SignUpModalContext.Provider value={{ showSignUpModal, hideSignUpModal }}>
      {children}
      <SignUpModal
        visible={visible}
        onClose={hideSignUpModal}
        onSuccess={handleSuccess}
        action={action}
      />
    </SignUpModalContext.Provider>
  );
}

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { SignUpModal } from '../components';

interface SignUpModalContextType {
  showSignUpModal: (options?: { action?: string; onSuccess?: () => void }) => void;
  hideSignUpModal: () => void;
}

const SignUpModalContext = createContext<SignUpModalContextType | null>(null);

export function useSignUpModal() {
  const context = useContext(SignUpModalContext);
  if (!context) {
    throw new Error('useSignUpModal must be used within a SignUpModalProvider');
  }
  return context;
}

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
      // Wrap in a function to store the callback properly
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

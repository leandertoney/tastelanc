import { createContext, useContext } from 'react';

export interface SignUpModalOptions {
  action?: string;
  onSuccess?: () => void;
}

export interface SignUpModalContextType {
  showSignUpModal: (options?: SignUpModalOptions) => void;
  hideSignUpModal: () => void;
}

export const SignUpModalContext = createContext<SignUpModalContextType | null>(null);

export function useSignUpModal() {
  const context = useContext(SignUpModalContext);
  if (!context) {
    throw new Error('useSignUpModal must be used within a SignUpModalProvider');
  }
  return context;
}

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EmailGateModal, { EMAIL_GATE_STORAGE_KEY } from '../components/EmailGateModal';
import { useAuth } from './AuthContext';

interface EmailGateContextType {
  hasProvidedEmail: boolean;
  requireEmailGate: (onSuccess: () => void) => void;
}

const EmailGateContext = createContext<EmailGateContextType | null>(null);

export function useEmailGate() {
  const context = useContext(EmailGateContext);
  if (!context) {
    throw new Error('useEmailGate must be used within an EmailGateProvider');
  }
  return context;
}

interface EmailGateProviderProps {
  children: ReactNode;
}

export function EmailGateProvider({ children }: EmailGateProviderProps) {
  const [hasProvidedEmail, setHasProvidedEmail] = useState(false);
  const [visible, setVisible] = useState(false);
  const [onSuccessCallback, setOnSuccessCallback] = useState<(() => void) | null>(null);
  const { user } = useAuth();

  // Initialize: check if email already provided
  useEffect(() => {
    const checkEmailStatus = async () => {
      try {
        // Check 1: AsyncStorage (fastest, covers previous gate completion)
        const stored = await AsyncStorage.getItem(EMAIL_GATE_STORAGE_KEY);
        if (stored) {
          setHasProvidedEmail(true);
          return;
        }

        // Check 2: Supabase user already has email (signed up via SignUpModal)
        if (user?.email) {
          setHasProvidedEmail(true);
          await AsyncStorage.setItem(EMAIL_GATE_STORAGE_KEY, user.email);
          return;
        }

        // Check 3: User is not anonymous (fully signed up)
        if (user && !user.is_anonymous) {
          setHasProvidedEmail(true);
          return;
        }
      } catch (error) {
        console.error('[EmailGate] Error checking status:', error);
      }
    };

    checkEmailStatus();
  }, [user]);

  // Sync: if user signs up via SignUpModal later, auto-lift the gate
  useEffect(() => {
    if (user?.email && !hasProvidedEmail) {
      setHasProvidedEmail(true);
      AsyncStorage.setItem(EMAIL_GATE_STORAGE_KEY, user.email).catch(console.error);
    }
  }, [user?.email, hasProvidedEmail]);

  const requireEmailGate = useCallback((onSuccess: () => void) => {
    if (hasProvidedEmail) {
      onSuccess();
      return;
    }
    setOnSuccessCallback(() => onSuccess);
    setVisible(true);
  }, [hasProvidedEmail]);

  const handleSuccess = useCallback(() => {
    setHasProvidedEmail(true);
    if (onSuccessCallback) {
      onSuccessCallback();
    }
    setVisible(false);
    setOnSuccessCallback(null);
  }, [onSuccessCallback]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setOnSuccessCallback(null);
  }, []);

  return (
    <EmailGateContext.Provider value={{ hasProvidedEmail, requireEmailGate }}>
      {children}
      <EmailGateModal
        visible={visible}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    </EmailGateContext.Provider>
  );
}

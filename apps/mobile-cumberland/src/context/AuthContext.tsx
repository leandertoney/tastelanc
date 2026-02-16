import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  userId: string | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAnonymous: boolean;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const userId = user?.id ?? null;
  const isAuthenticated = !!user;
  const isAnonymous = user?.is_anonymous ?? false;

  /**
   * Initialize auth - check for existing session or create anonymous user
   */
  const initializeAuth = useCallback(async () => {
    try {
      // First, check for existing session
      const { data: { session: existingSession }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Error getting session:', sessionError);
      }

      if (existingSession?.user) {
        // Existing session found
        setSession(existingSession);
        setUser(existingSession.user);
        console.log('Existing session found:', existingSession.user.id);
      } else {
        // No session - create anonymous user
        console.log('No session found, creating anonymous user...');
        const { data, error } = await supabase.auth.signInAnonymously();

        if (error) {
          console.error('Error creating anonymous user:', error);
          throw error;
        }

        if (data.session && data.user) {
          setSession(data.session);
          setUser(data.user);
          console.log('Anonymous user created:', data.user.id);

          // Create profile for new user
          await ensureProfileExists(data.user.id);
        }
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Ensure a profile row exists for the user
   */
  const ensureProfileExists = async (userId: string) => {
    try {
      // Check if profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is expected for new users
        console.error('Error checking profile:', fetchError);
        return;
      }

      if (!existingProfile) {
        // Create new profile with default values
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            premium_active: false,
            premium_source: null,
            premium_expires_at: null,
          });

        if (insertError) {
          console.error('Error creating profile:', insertError);
        } else {
          console.log('Profile created for user:', userId);
        }
      }
    } catch (error) {
      console.error('Error ensuring profile exists:', error);
    }
  };

  /**
   * Refresh session manually
   */
  const refreshSession = useCallback(async () => {
    try {
      const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();

      if (error) {
        console.error('Error refreshing session:', error);
        return;
      }

      if (refreshedSession) {
        setSession(refreshedSession);
        setUser(refreshedSession.user);
      }
    } catch (error) {
      console.error('Error in refreshSession:', error);
    }
  }, []);

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth state changed:', event);

        if (newSession) {
          setSession(newSession);
          setUser(newSession.user);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Refresh session when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && session) {
        refreshSession();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [session, refreshSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        userId,
        session,
        isLoading,
        isAuthenticated,
        isAnonymous,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

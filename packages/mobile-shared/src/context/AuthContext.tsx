import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { User, Session } from '@supabase/supabase-js';
import { getSupabase } from '../config/theme';

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

  const initializeAuth = useCallback(async () => {
    try {
      const supabase = getSupabase();
      const { data: { session: existingSession }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Error getting session:', sessionError);
      }

      if (existingSession?.user) {
        setSession(existingSession);
        setUser(existingSession.user);
        console.log('Existing session found:', existingSession.user.id);

        supabase.from('profiles')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', existingSession.user.id)
          .then(
            () => {},
            (e) => console.warn('[Auth] last_seen update failed:', e),
          );
      } else {
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
          await ensureProfileExists(data.user.id);
        }
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const ensureProfileExists = async (uid: string) => {
    try {
      const supabase = getSupabase();
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', uid)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking profile:', fetchError);
        return;
      }

      if (!existingProfile) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: uid,
            premium_active: false,
            premium_source: null,
            premium_expires_at: null,
            last_seen_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error('Error creating profile:', insertError);
        } else {
          console.log('Profile created for user:', uid);
        }
      }
    } catch (error) {
      console.error('Error ensuring profile exists:', error);
    }
  };

  const refreshSession = useCallback(async () => {
    try {
      const supabase = getSupabase();
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

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const checkTriviaAutoClaim = useCallback(async (user: User) => {
    // Only check for non-anonymous users with email
    if (!user.email || user.is_anonymous) return;

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'https://tastelanc.com'}/api/trivia/auto-claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await getSupabase().auth.getSession()).data.session?.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.claimed && data.results?.length > 0) {
          console.log('[TFK Auto-Claim] ✓ Prizes claimed:', data.results);
          // Prizes automatically appear in My Coupons
        }
      }
    } catch (error) {
      console.error('[TFK Auto-Claim] Error:', error);
      // Fail silently - don't block login
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth state changed:', event);

        if (newSession) {
          setSession(newSession);
          setUser(newSession.user);

          // Check for trivia prize auto-claims when user signs in
          if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') {
            checkTriviaAutoClaim(newSession.user);
          }
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [checkTriviaAutoClaim]);

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

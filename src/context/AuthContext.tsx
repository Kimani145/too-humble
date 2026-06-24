// =============================================================================
// TOO HUMBLE - AUTHENTICATION CONTEXT
// Provides session state, profile, role, and auth actions app-wide
// =============================================================================

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile, UserRole } from '../types/database.types';

// -----------------------------------------------------------------------
// Context shape
// -----------------------------------------------------------------------
interface AuthContextValue {
  // State
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<Profile, 'full_name' | 'avatar_url' | 'fb_link'>>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// -----------------------------------------------------------------------
// Defaults / error guard
// -----------------------------------------------------------------------
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return ctx;
}

// -----------------------------------------------------------------------
// Provider
// -----------------------------------------------------------------------
interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): React.JSX.Element {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isMounted = useRef<boolean>(true);

  // ----------------------------------------------------------------
  // Fetch profile from public.profiles
  // ----------------------------------------------------------------
  const fetchProfile = useCallback(async (userId: string): Promise<void> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[AuthContext] fetchProfile error:', error.message);
      return;
    }
    if (isMounted.current) {
      setProfile(data as Profile);
    }
  }, []);

  // ----------------------------------------------------------------
  // Bootstrap session on mount
  // ----------------------------------------------------------------
  useEffect(() => {
    isMounted.current = true;

    const bootstrapSession = async (): Promise<void> => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('[AuthContext] getSession error:', error.message);
      }

      if (isMounted.current) {
        const activeSession = data.session;
        setSession(activeSession);
        setUser(activeSession?.user ?? null);

        if (activeSession?.user) {
          await fetchProfile(activeSession.user.id);
        }
        setIsLoading(false);
      }
    };

    bootstrapSession();

    // Subscribe to auth state changes
    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!isMounted.current) return;

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          await fetchProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      isMounted.current = false;
      subscription.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // ----------------------------------------------------------------
  // Login
  // ----------------------------------------------------------------
  const login = useCallback(async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const { error }: { error: AuthError | null } =
        await supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, []);

  // ----------------------------------------------------------------
  // Register
  // ----------------------------------------------------------------
  const register = useCallback(
    async (email: string, password: string, fullName: string): Promise<void> => {
      setIsLoading(true);
      try {
        const { error }: { error: AuthError | null } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });

        if (error) throw error;
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    },
    []
  );

  // ----------------------------------------------------------------
  // Google OAuth
  // ----------------------------------------------------------------
  const loginWithGoogle = useCallback(async (): Promise<void> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'toohumble://auth/callback',
      },
    });
    if (error) throw error;
  }, []);

  // ----------------------------------------------------------------
  // Logout
  // ----------------------------------------------------------------
  const logout = useCallback(async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    if (isMounted.current) {
      setSession(null);
      setUser(null);
      setProfile(null);
    }
  }, []);

  // ----------------------------------------------------------------
  // Update profile
  // ----------------------------------------------------------------
  const updateProfile = useCallback(
    async (
      updates: Partial<Pick<Profile, 'full_name' | 'avatar_url' | 'fb_link'>>
    ): Promise<void> => {
      if (!user) throw new Error('Not authenticated');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      if (isMounted.current) setProfile(data as Profile);
    },
    [user]
  );

  // ----------------------------------------------------------------
  // Refresh profile (manual pull)
  // ----------------------------------------------------------------
  const refreshProfile = useCallback(async (): Promise<void> => {
    if (!user) return;
    await fetchProfile(user.id);
  }, [user, fetchProfile]);

  // ----------------------------------------------------------------
  // Derived state
  // ----------------------------------------------------------------
  const role: UserRole | null = profile?.role ?? null;
  const isAuthenticated = session !== null && user !== null;

  const value: AuthContextValue = {
    session,
    user,
    profile,
    role,
    isLoading,
    isAuthenticated,
    login,
    register,
    loginWithGoogle,
    logout,
    updateProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

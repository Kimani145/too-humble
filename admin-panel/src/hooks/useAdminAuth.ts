import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { AdminProfile } from '../types';
import type { Session } from '@supabase/supabase-js';

interface AdminAuthState {
  session:    Session | null;
  profile:    AdminProfile | null;
  isAdmin:    boolean;
  isLoading:  boolean;
}

export function useAdminAuth(): AdminAuthState & { signOut: () => Promise<void> } {
  const [state, setState] = useState<AdminAuthState>({
    session: null,
    profile: null,
    isAdmin: false,
    isLoading: true,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchProfile(session);
      } else {
        setState((s) => ({ ...s, isLoading: false }));
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchProfile(session);
      } else {
        setState({ session: null, profile: null, isAdmin: false, isLoading: false });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(session: Session): Promise<void> {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      const profile = data as AdminProfile | null;
      setState({
        session,
        profile,
        isAdmin: profile?.role === 'admin',
        isLoading: false,
      });
    } catch {
      setState({
        session,
        profile: null,
        isAdmin: false,
        isLoading: false,
      });
    }
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut();
  }

  return { ...state, signOut };
}

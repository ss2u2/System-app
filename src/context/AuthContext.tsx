import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { pullSyncData } from '../services/sync';
import { store } from '../services/db';
import { setupRealtimeSubscription, cleanupRealtimeSubscription } from '../services/realtime';

interface AuthContextType {
  user: User | null | undefined;
  session: Session | null;
  loadingData: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null | undefined>(undefined); // undefined = still loading
  const [session, setSession] = useState<Session | null>(null);
  const [loadingData, setLoadingData] = useState<boolean>(false);

  useEffect(() => {
    if (!supabase) {
      setUser(null);
      return;
    }

    // Get the current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData();
        setupRealtimeSubscription(session.user.id);
      }
    });

    // Subscribe to future auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'SIGNED_IN' && session?.user) {
          await loadUserData();
          setupRealtimeSubscription(session.user.id);
        }

        if (event === 'SIGNED_OUT') {
          // Clear local state so a different user doesn't see stale data
          localStorage.removeItem('system_app_state');
          store.setState({ _reset: true }, true);
          cleanupRealtimeSubscription();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function loadUserData() {
    setLoadingData(true);
    try {
      const cloudState = await pullSyncData();
      if (cloudState) {
        store.setState(cloudState, true);
      }
    } catch (err: any) {
      console.warn('Could not pull cloud data on sign-in:', err.message);
    } finally {
      setLoadingData(false);
    }
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, session, loadingData, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

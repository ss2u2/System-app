import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { pullSyncData, triggerSync } from '../services/sync';
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

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage = 'Operation timed out'): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), timeoutMs))
  ]);
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

    let isMounted = true;
    let subscription: any = null;

    // Safety timeout: if auth initialization doesn't finish in 3.5 seconds,
    // fallback to local-only mode to prevent indefinite loading splash.
    const fallbackTimeout = setTimeout(() => {
      if (isMounted && user === undefined) {
        console.warn('Supabase auth check timed out. Falling back to local-only/unauthenticated state.');
        setUser(null);
      }
    }, 3500);

    // Get the current session on mount
    supabase.auth.getSession()
      .then((result) => {
        if (!isMounted) return;
        
        const session = result?.data?.session ?? null;
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          loadUserData();
          setupRealtimeSubscription(session.user.id);
        }
      })
      .catch((err) => {
        console.error('Failed to get session from Supabase:', err);
        if (isMounted) {
          setSession(null);
          setUser(null);
        }
      })
      .finally(() => {
        clearTimeout(fallbackTimeout);
      });

    // Subscribe to future auth changes (login, logout, token refresh)
    try {
      const authListener = supabase.auth.onAuthStateChange(
        (event, session) => {
          if (!isMounted) return;
          
          console.log('AuthContext: onAuthStateChange event:', event, 'user:', session?.user?.email);
          setSession(session);
          setUser(session?.user ?? null);

          if (event === 'SIGNED_IN' && session?.user) {
            console.log('AuthContext: SIGNED_IN event, scheduling non-blocking data load and realtime setup...');
            const userId = session.user.id;
            setTimeout(() => {
              if (!isMounted) return;
              loadUserData().then(() => {
                if (isMounted) {
                  console.log('AuthContext: Background data load complete, setting up realtime subscription...');
                  setupRealtimeSubscription(userId);
                }
              }).catch(err => {
                console.error('AuthContext: Background data load failed:', err);
              });
            }, 0);
          }

          if (event === 'SIGNED_OUT') {
            // Clear local state so a different user doesn't see stale data
            localStorage.removeItem('system_app_state');
            store.setState({ _reset: true }, true);
            cleanupRealtimeSubscription();
          }
        }
      );
      
      subscription = authListener?.data?.subscription;
    } catch (err) {
      console.error('Failed to subscribe to auth state changes:', err);
    }

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimeout);
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch (e) {
          console.warn('Failed to unsubscribe from auth state changes:', e);
        }
      }
    };
  }, []);

  // Handle tab visibility changes to reconnect realtime subscription and trigger sync catch-up
  useEffect(() => {
    const client = supabase;
    if (!client) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        // Quick check if user is logged in
        const { data: { session } } = await client.auth.getSession();
        if (!session?.user) return;

        console.log("Tab focused! Re-syncing with Supabase...");

        // 1. Force the Realtime socket to reconnect if dropped
        if (client.realtime && !client.realtime.isConnected()) {
          console.log("Realtime socket disconnected. Reconnecting...");
          client.realtime.connect();
        }

        // 2. Trigger an immediate cloud pull with an 8-second timeout to refresh stale data
        setLoadingData(true);
        try {
          const cloudState = await withTimeout(pullSyncData(), 8000, 'Cloud pull timed out');
          if (cloudState) {
            store.setState(cloudState, true); // Update local state, skip automatic push
          }
        } catch (err: any) {
          console.warn("Failed to catch up from cloud on tab focus:", err.message);
        } finally {
          setLoadingData(false);
        }

        // 3. Force background sync engine to push any pending local edits
        triggerSync();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  async function loadUserData() {
    setLoadingData(true);
    try {
      const cloudState = await withTimeout(pullSyncData(), 8000, 'Cloud pull timed out');
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

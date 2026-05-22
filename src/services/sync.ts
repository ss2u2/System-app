// Supabase Sync Service for write-local, sync-global architecture
import { supabase } from './supabase';
import type { AppState, AppStore } from '../types';

let syncTimeout: ReturnType<typeof setTimeout> | null = null;
let storeRef: AppStore | null = null;

/**
 * Registers the local store reference to prevent circular import dependencies
 */
export function registerStore(store: AppStore): void {
  storeRef = store;
}

/**
 * Pushes the local state changes to Supabase database.
 * Debounced to prevent continuous network requests on quick user actions.
 */
export function triggerSync(state: Partial<AppState>): void {
  const client = supabase;
  if (!client) return;

  if (syncTimeout) clearTimeout(syncTimeout);

  syncTimeout = setTimeout(async () => {
    try {
      const { data: { user }, error: authErr } = await client.auth.getUser();
      if (authErr || !user) return; // User must be authenticated to sync

      const userId = user.id;

      // 1. Sync tasks
      if (state.tasks && state.tasks.length > 0) {
        try {
          const taskPayloads = state.tasks.map(t => ({
            id: t.id,
            user_id: userId,
            name: t.name,
            cat: t.cat,
            done: t.done
          }));
          await client.from('tasks').upsert(taskPayloads);
        } catch (err) {
          console.warn("Failed to sync tasks to Supabase:", err);
        }
      }

      // 1b. Delete tasks
      if (state.deletedIds?.tasks && state.deletedIds.tasks.length > 0) {
        try {
          const { error } = await client.from('tasks').delete().in('id', state.deletedIds.tasks);
          if (!error && storeRef) {
            storeRef.setState({
              deletedIds: {
                ...storeRef.getState().deletedIds,
                tasks: []
              }
            }, true);
          }
        } catch (err) {
          console.warn("Failed to delete tasks from Supabase:", err);
        }
      }

      // 2. Sync sessions
      if (state.sessions && state.sessions.length > 0) {
        try {
          const sessionPayloads = state.sessions.map(s => ({
            id: s.id,
            user_id: userId,
            name: s.name,
            icon: s.icon,
            color: s.color,
            steps: s.steps
          }));
          await client.from('sessions').upsert(sessionPayloads);
        } catch (err) {
          console.warn("Failed to sync sessions to Supabase:", err);
        }
      }

      // 2b. Delete sessions
      if (state.deletedIds?.sessions && state.deletedIds.sessions.length > 0) {
        try {
          const { error } = await client.from('sessions').delete().in('id', state.deletedIds.sessions);
          if (!error && storeRef) {
            storeRef.setState({
              deletedIds: {
                ...storeRef.getState().deletedIds,
                sessions: []
              }
            }, true);
          }
        } catch (err) {
          console.warn("Failed to delete sessions from Supabase:", err);
        }
      }

      // 3. Sync goals (weekly, monthly, static)
      try {
        const goalPayloads = [
          ...(state.weekly || []).map(g => ({ id: g.id, user_id: userId, type: 'weekly', name: g.name, target: g.target, current: g.current, emoji: '🎯', note: '', cat: 'other', progress: 0 })),
          ...(state.monthly || []).map(g => ({ id: g.id, user_id: userId, type: 'monthly', name: g.name, target: g.target, current: g.current, emoji: '🎯', note: '', cat: 'other', progress: 0 })),
          ...(state.static || []).map(g => ({ id: g.id, user_id: userId, type: 'static', name: g.name, target: 100, current: g.progress, emoji: g.emoji, note: g.note || '', cat: g.cat || 'other', progress: g.progress }))
        ];
        if (goalPayloads.length > 0) {
          await client.from('goals').upsert(goalPayloads);
        }
      } catch (err) {
        console.warn("Failed to sync goals to Supabase:", err);
      }

      // 3b. Delete goals
      if (state.deletedIds?.goals && state.deletedIds.goals.length > 0) {
        try {
          const { error } = await client.from('goals').delete().in('id', state.deletedIds.goals);
          if (!error && storeRef) {
            storeRef.setState({
              deletedIds: {
                ...storeRef.getState().deletedIds,
                goals: []
              }
            }, true);
          }
        } catch (err) {
          console.warn("Failed to delete goals from Supabase:", err);
        }
      }

      // 4. Sync journals
      if (state.journals && state.journals.length > 0) {
        try {
          const journalPayloads = state.journals.map(j => ({
            id: j.id,
            user_id: userId,
            title: j.title || '',
            content: typeof j.content === 'string' ? j.content : JSON.stringify(j.content)
          }));
          await client.from('journals').upsert(journalPayloads);
        } catch (err) {
          console.warn("Failed to sync journals to Supabase:", err);
        }
      }

      // 4b. Delete journals
      if (state.deletedIds?.journals && state.deletedIds.journals.length > 0) {
        try {
          const { error } = await client.from('journals').delete().in('id', state.deletedIds.journals);
          if (!error && storeRef) {
            storeRef.setState({
              deletedIds: {
                ...storeRef.getState().deletedIds,
                journals: []
              }
            }, true);
          }
        } catch (err) {
          console.warn("Failed to delete journals from Supabase:", err);
        }
      }

      // 7. Sync profiles stats
      try {
        await client.from('profiles').upsert({
          id: userId,
          streak: state.streak || 0,
          completion_history: state.completionHistory || {},
          last_active_date: state.lastActiveDate || new Date().toDateString(),
          updated_at: new Date().toISOString()
        });
      } catch (err) {
        console.warn("Failed to sync profile to Supabase:", err);
      }

      console.log("Supabase background sync success.");
    } catch (e: any) {
      console.warn("Supabase background sync connection failed (will retry on next change):", e.message);
    }
  }, 2000); // 2 second debounce delay
}

/**
 * Pulls all remote state data from Supabase.
 * Returns the unified state object to update local storage.
 * Queries each table resiliently to prevent partial failures from crashing the sync.
 */
export async function pullSyncData(): Promise<Partial<AppState> | null> {
  const client = supabase;
  if (!client) return null;

  try {
    const { data: { user }, error: authErr } = await client.auth.getUser();
    if (authErr || !user) return null;

    const userId = user.id;

    // Resilient table helper
    const fetchTable = async (table: string, columns = '*'): Promise<any[] | null> => {
      try {
        const { data, error } = await client
          .from(table)
          .select(columns)
          .eq(table === 'profiles' ? 'id' : 'user_id', userId);
        
        if (error) {
          console.warn(`Supabase warning pulling table "${table}":`, error.message);
          return null;
        }
        return data;
      } catch (err: any) {
        console.warn(`Supabase exception pulling table "${table}":`, err.message);
        return null;
      }
    };

    // Fetch profile data helper
    const fetchProfile = async (): Promise<any | null> => {
      try {
        const { data, error } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();
        if (error) return null;
        return data;
      } catch {
        return null;
      }
    };

    // Fetch from all tables in parallel with catch-all resiliency
    const [
      tasksData,
      sessionsData,
      goalsData,
      journalsData,
      profileData
    ] = await Promise.all([
      fetchTable('tasks'),
      fetchTable('sessions'),
      fetchTable('goals'),
      fetchTable('journals'),
      fetchProfile()
    ]);

    const newState: Partial<AppState> = {};

    if (tasksData) {
      newState.tasks = tasksData.map((t: any) => ({ id: Number(t.id), name: t.name, cat: t.cat, done: t.done }));
    }
    if (sessionsData) {
      newState.sessions = sessionsData.map((s: any) => ({ id: Number(s.id), name: s.name, icon: s.icon, color: s.color, steps: s.steps, open: false }));
    }
    if (goalsData) {
      newState.weekly = goalsData.filter((g: any) => g.type === 'weekly').map((g: any) => ({ id: Number(g.id), name: g.name, target: g.target, current: g.current }));
      newState.monthly = goalsData.filter((g: any) => g.type === 'monthly').map((g: any) => ({ id: Number(g.id), name: g.name, target: g.target, current: g.current }));
      newState.static = goalsData.filter((g: any) => g.type === 'static').map((g: any) => ({ id: Number(g.id), name: g.name, emoji: g.emoji, note: g.note, cat: g.cat, progress: g.progress }));
    }
    if (journalsData) {
      newState.journals = journalsData.map((j: any) => ({ id: Number(j.id), title: j.title, content: j.content }));
    }
    if (profileData) {
      newState.streak = profileData.streak;
      newState.completionHistory = profileData.completion_history;
      newState.lastActiveDate = profileData.last_active_date;
    }

    return Object.keys(newState).length > 0 ? newState : null;
  } catch (e) {
    console.error("Error pulling data from Supabase:", e);
    return null;
  }
}

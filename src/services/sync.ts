// Supabase Sync Service for write-local, sync-global architecture
import { supabase } from './supabase';
import type { AppStore } from '../types';

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
 * Reads the LATEST state from storeRef at fire time to avoid stale closures.
 */
export function triggerSync(): void {
  const client = supabase;
  if (!client) return;

  if (syncTimeout) clearTimeout(syncTimeout);

  syncTimeout = setTimeout(async () => {
    // Always read the FRESHEST state at fire time, not a stale snapshot
    if (!storeRef) return;
    const state = storeRef.getState();

    try {
      const { data: { user }, error: authErr } = await client.auth.getUser();
      if (authErr || !user) {
        console.warn('Supabase sync skipped: user not authenticated.', authErr?.message);
        return;
      }

      const userId = user.id;

      // 0. Sync lists
      try {
        const listPayloads = (state.lists || []).map(l => ({
          id: l.id,
          user_id: userId,
          name: l.name
        }));
        if (listPayloads.length > 0) {
          const { error } = await client.from('lists').upsert(listPayloads, { onConflict: 'id' });
          if (error) console.error('Supabase upsert error [lists]:', error.message);
        }
      } catch (err) {
        console.warn('Failed to sync lists to Supabase:', err);
      }

      // 0b. Delete lists
      if (state.deletedIds?.lists && state.deletedIds.lists.length > 0) {
        try {
          const { error } = await client.from('lists').delete().in('id', state.deletedIds.lists);
          if (error) {
            console.error('Supabase delete error [lists]:', error.message);
          } else if (storeRef) {
            storeRef.setState({
              deletedIds: {
                ...storeRef.getState().deletedIds,
                lists: []
              }
            }, true);
          }
        } catch (err) {
          console.warn('Failed to delete lists from Supabase:', err);
        }
      }

      // 1. Sync tasks (always upsert regardless of array length)
      try {
        const taskPayloads = (state.tasks || []).map(t => {
          let parsedRepeatValue = null;
          if (t.repeatValue) {
            try {
              parsedRepeatValue = JSON.parse(t.repeatValue);
            } catch {
              parsedRepeatValue = t.repeatValue;
            }
          }
          return {
            id: t.id,
            user_id: userId,
            list_id: (t.listId === 'toady' || !t.listId) ? null : Number(t.listId),
            name: t.name,
            cat: t.cat || '',
            done: t.done,
            starred: t.starred || false,
            task_date: t.date || null,
            task_time: t.time || null,
            repeat_type: t.repeatType || 'none',
            repeat_value: parsedRepeatValue,
            deadline: t.deadline || null,
            details: t.details || null
          };
        });
        if (taskPayloads.length > 0) {
          const { error } = await client.from('tasks').upsert(taskPayloads, { onConflict: 'id' });
          if (error) console.error('Supabase upsert error [tasks]:', error.message, error.details);
        }
      } catch (err) {
        console.warn('Failed to sync tasks to Supabase:', err);
      }

      // 1b. Sync subtasks relationally
      try {
        const subtaskPayloads = (state.tasks || []).flatMap(t => 
          (t.subtasks || []).map(st => ({
            id: st.id,
            task_id: t.id,
            name: st.name,
            done: st.done
          }))
        );
        if (subtaskPayloads.length > 0) {
          const { error: upsertErr } = await client.from('subtasks').upsert(subtaskPayloads, { onConflict: 'id' });
          if (upsertErr) console.error('Supabase upsert error [subtasks]:', upsertErr.message);

          const activeSubtaskIds = subtaskPayloads.map(st => st.id);
          const activeTaskIds = (state.tasks || []).map(t => t.id);
          if (activeTaskIds.length > 0) {
            const { error: deleteErr } = await client
              .from('subtasks')
              .delete()
              .in('task_id', activeTaskIds)
              .not('id', 'in', `(${activeSubtaskIds.join(',')})`);
            if (deleteErr) console.error('Supabase subtask cleanup error:', deleteErr.message);
          }
        } else {
          const activeTaskIds = (state.tasks || []).map(t => t.id);
          if (activeTaskIds.length > 0) {
            await client.from('subtasks').delete().in('task_id', activeTaskIds);
          }
        }
      } catch (err) {
        console.warn('Failed to sync subtasks to Supabase:', err);
      }

      // 1c. Delete tasks
      if (state.deletedIds?.tasks && state.deletedIds.tasks.length > 0) {
        try {
          const { error } = await client.from('tasks').delete().in('id', state.deletedIds.tasks);
          if (error) {
            console.error('Supabase delete error [tasks]:', error.message);
          } else if (storeRef) {
            storeRef.setState({
              deletedIds: {
                ...storeRef.getState().deletedIds,
                tasks: []
              }
            }, true);
          }
        } catch (err) {
          console.warn('Failed to delete tasks from Supabase:', err);
        }
      }

      // 2. Sync sessions (always upsert regardless of array length)
      try {
        const sessionPayloads = (state.sessions || []).map(s => ({
          id: s.id,
          user_id: userId,
          name: s.name,
          icon: s.icon,
          color: s.color,
          steps: s.steps
        }));
        if (sessionPayloads.length > 0) {
          const { error } = await client.from('sessions').upsert(sessionPayloads, { onConflict: 'id' });
          if (error) console.error('Supabase upsert error [sessions]:', error.message, error.details);
        }
      } catch (err) {
        console.warn('Failed to sync sessions to Supabase:', err);
      }

      // 2b. Delete sessions
      if (state.deletedIds?.sessions && state.deletedIds.sessions.length > 0) {
        try {
          const { error } = await client.from('sessions').delete().in('id', state.deletedIds.sessions);
          if (error) {
            console.error('Supabase delete error [sessions]:', error.message);
          } else if (storeRef) {
            storeRef.setState({
              deletedIds: {
                ...storeRef.getState().deletedIds,
                sessions: []
              }
            }, true);
          }
        } catch (err) {
          console.warn('Failed to delete sessions from Supabase:', err);
        }
      }

      // 3. Sync goals (weekly, monthly, static — always upsert regardless of array length)
      try {
        const goalPayloads = [
          ...(state.weekly || []).map(g => ({ id: g.id, user_id: userId, type: 'weekly', name: g.name, target: g.target, current: g.current, emoji: '🎯', note: '', cat: 'other', progress: 0 })),
          ...(state.monthly || []).map(g => ({ id: g.id, user_id: userId, type: 'monthly', name: g.name, target: g.target, current: g.current, emoji: '🎯', note: '', cat: 'other', progress: 0 })),
          ...(state.static || []).map(g => ({ id: g.id, user_id: userId, type: 'static', name: g.name, target: 100, current: g.progress, emoji: g.emoji, note: g.note || '', cat: g.cat || 'other', progress: g.progress }))
        ];
        if (goalPayloads.length > 0) {
          const { error } = await client.from('goals').upsert(goalPayloads, { onConflict: 'id' });
          if (error) console.error('Supabase upsert error [goals]:', error.message, error.details);
        }
      } catch (err) {
        console.warn('Failed to sync goals to Supabase:', err);
      }

      // 3b. Delete goals
      if (state.deletedIds?.goals && state.deletedIds.goals.length > 0) {
        try {
          const { error } = await client.from('goals').delete().in('id', state.deletedIds.goals);
          if (error) {
            console.error('Supabase delete error [goals]:', error.message);
          } else if (storeRef) {
            storeRef.setState({
              deletedIds: {
                ...storeRef.getState().deletedIds,
                goals: []
              }
            }, true);
          }
        } catch (err) {
          console.warn('Failed to delete goals from Supabase:', err);
        }
      }

      // 4. Sync journals (always upsert regardless of array length)
      try {
        const journalPayloads = (state.journals || []).map(j => ({
          id: j.id,
          user_id: userId,
          title: j.title || '',
          content: typeof j.content === 'string' ? j.content : JSON.stringify(j.content)
        }));
        if (journalPayloads.length > 0) {
          const { error } = await client.from('journals').upsert(journalPayloads, { onConflict: 'id' });
          if (error) console.error('Supabase upsert error [journals]:', error.message, error.details);
        }
      } catch (err) {
        console.warn('Failed to sync journals to Supabase:', err);
      }

      // 4b. Delete journals
      if (state.deletedIds?.journals && state.deletedIds.journals.length > 0) {
        try {
          const { error } = await client.from('journals').delete().in('id', state.deletedIds.journals);
          if (error) {
            console.error('Supabase delete error [journals]:', error.message);
          } else if (storeRef) {
            storeRef.setState({
              deletedIds: {
                ...storeRef.getState().deletedIds,
                journals: []
              }
            }, true);
          }
        } catch (err) {
          console.warn('Failed to delete journals from Supabase:', err);
        }
      }

      // 5. Sync profile stats
      try {
        const { error } = await client.from('profiles').upsert({
          id: userId,
          streak: state.streak || 0,
          completion_history: state.completionHistory || {},
          last_active_date: state.lastActiveDate || new Date().toDateString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
        if (error) console.error('Supabase upsert error [profiles]:', error.message, error.details);
      } catch (err) {
        console.warn('Failed to sync profile to Supabase:', err);
      }

      console.log('✅ Supabase background sync success.');
    } catch (e: any) {
      console.warn('Supabase background sync connection failed (will retry on next change):', e.message);
    }
  }, 2000); // 2 second debounce delay
}

/**
 * Pulls all remote state data from Supabase.
 * Returns the unified state object to update local storage.
 * Queries each table resiliently to prevent partial failures from crashing the sync.
 */
export async function pullSyncData(): Promise<Partial<import('../types').AppState> | null> {
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

    // Fetch tasks with nested relation to subtasks
    const fetchTasksWithSubtasks = async (): Promise<any[] | null> => {
      try {
        const { data, error } = await client
          .from('tasks')
          .select('*, subtasks(*)')
          .eq('user_id', userId);
        
        if (error) {
          console.warn('Supabase warning pulling tasks and subtasks:', error.message);
          return null;
        }
        return data;
      } catch (err: any) {
        console.warn('Supabase exception pulling tasks and subtasks:', err.message);
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

    // Fetch from all tables in parallel
    const [
      listsData,
      tasksData,
      sessionsData,
      goalsData,
      journalsData,
      profileData
    ] = await Promise.all([
      fetchTable('lists'),
      fetchTasksWithSubtasks(),
      fetchTable('sessions'),
      fetchTable('goals'),
      fetchTable('journals'),
      fetchProfile()
    ]);

    const newState: Partial<import('../types').AppState> = {};

    if (listsData) {
      newState.lists = listsData.map((l: any) => ({ id: Number(l.id), name: l.name }));
    }
    if (tasksData) {
      newState.tasks = tasksData.map((t: any) => {
        let repeatValStr = '';
        if (t.repeat_value) {
          try {
            repeatValStr = typeof t.repeat_value === 'string' ? t.repeat_value : JSON.stringify(t.repeat_value);
          } catch {}
        }
        return {
          id: Number(t.id),
          name: t.name,
          done: t.done,
          starred: t.starred,
          listId: t.list_id ? Number(t.list_id) : null,
          cat: t.cat || '',
          date: t.task_date || undefined,
          time: t.task_time || undefined,
          repeatType: t.repeat_type || 'none',
          repeatValue: repeatValStr,
          deadline: t.deadline || undefined,
          details: t.details || undefined,
          subtasks: (t.subtasks || []).map((st: any) => ({
            id: Number(st.id),
            name: st.name,
            done: st.done
          }))
        };
      });
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
    console.error('Error pulling data from Supabase:', e);
    return null;
  }
}

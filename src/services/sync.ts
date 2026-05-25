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
import type { AppState } from '../types';
let lastSyncedState: AppState | null = null;

/**
 * Manually baseline the last synced state when pulling remote changes.
 */
export function setLastSyncedState(state: AppState): void {
  lastSyncedState = JSON.parse(JSON.stringify(state));
}

/**
 * Pushes the local state changes to Supabase database.
 * Uses a diffing engine to sync ONLY modified rows (deltas) to minimize database load.
 */
export function triggerSync(): void {
  const client = supabase;
  if (!client) return;

  if (syncTimeout) clearTimeout(syncTimeout);

  syncTimeout = setTimeout(async () => {
    if (!storeRef) return;
    const state = storeRef.getState();

    // Initialize baseline snapshot if missing (force initial upload of seed data)
    if (!lastSyncedState) {
      lastSyncedState = {
        sessions: [],
        tasks: [],
        lists: [],
        weekly: [],
        monthly: [],
        static: [],
        journals: [],
        completionHistory: {},
        streak: 0,
        lastActiveDate: '',
        deletedIds: { tasks: [], sessions: [], goals: [], journals: [], lists: [] }
      };
    }

    try {
      const { data: { user }, error: authErr } = await client.auth.getUser();
      if (authErr || !user) {
        console.warn('Supabase sync skipped: user not authenticated.', authErr?.message);
        return;
      }

      const userId = user.id;

      // ─── DIFFING ENGINE ───

      // 1. Lists
      const prevLists = lastSyncedState.lists || [];
      const currLists = state.lists || [];
      const listsToUpsert = currLists.filter(l => {
        const prev = prevLists.find(p => String(p.id) === String(l.id));
        return !prev || prev.name !== l.name;
      });
      const listsToDelete = state.deletedIds?.lists || [];

      // 2. Tasks
      const prevTasks = lastSyncedState.tasks || [];
      const currTasks = state.tasks || [];
      const tasksToUpsert = currTasks.filter(t => {
        const prev = prevTasks.find(p => String(p.id) === String(t.id));
        if (!prev) return true;
        return (
          prev.name !== t.name ||
          prev.done !== t.done ||
          prev.starred !== t.starred ||
          String(prev.listId) !== String(t.listId) ||
          prev.cat !== t.cat ||
          prev.date !== t.date ||
          prev.time !== t.time ||
          prev.repeatType !== t.repeatType ||
          prev.repeatValue !== t.repeatValue ||
          prev.deadline !== t.deadline ||
          prev.details !== t.details ||
          JSON.stringify(prev.subtasks) !== JSON.stringify(t.subtasks)
        );
      });
      const tasksToDelete = state.deletedIds?.tasks || [];

      // 3. Sessions
      const prevSessions = lastSyncedState.sessions || [];
      const currSessions = state.sessions || [];
      const sessionsToUpsert = currSessions.filter(s => {
        const prev = prevSessions.find(p => String(p.id) === String(s.id));
        if (!prev) return true;
        return (
          prev.name !== s.name ||
          prev.icon !== s.icon ||
          prev.color !== s.color ||
          JSON.stringify(prev.steps) !== JSON.stringify(s.steps)
        );
      });
      const sessionsToDelete = state.deletedIds?.sessions || [];

      // 4. Goals (weekly, monthly, static combined in DB)
      const getGoalKey = (g: any, type: string) => `${type}_${g.id}`;
      const getGoalsList = (s: AppState) => [
        ...(s.weekly || []).map(g => ({ ...g, type: 'weekly' })),
        ...(s.monthly || []).map(g => ({ ...g, type: 'monthly' })),
        ...(s.static || []).map(g => ({ ...g, type: 'static' }))
      ];
      const prevGoals = getGoalsList(lastSyncedState);
      const currGoals = getGoalsList(state);
      const goalsToUpsert = currGoals.filter(g => {
        const prev = prevGoals.find(p => getGoalKey(p, p.type) === getGoalKey(g, g.type));
        if (!prev) return true;
        return (
          prev.name !== g.name ||
          (prev as any).target !== (g as any).target ||
          (prev as any).current !== (g as any).current ||
          (prev as any).emoji !== (g as any).emoji ||
          (prev as any).note !== (g as any).note ||
          (prev as any).cat !== (g as any).cat ||
          (prev as any).progress !== (g as any).progress
        );
      });
      const goalsToDelete = state.deletedIds?.goals || [];

      // 5. Journals
      const prevJournals = lastSyncedState.journals || [];
      const currJournals = state.journals || [];
      const journalsToUpsert = currJournals.filter(j => {
        const prev = prevJournals.find(p => String(p.id) === String(j.id));
        if (!prev) return true;
        return (
          prev.title !== j.title ||
          prev.content !== j.content ||
          prev.bookmarked !== j.bookmarked ||
          prev.location !== j.location ||
          prev.draft !== j.draft ||
          JSON.stringify(prev.images) !== JSON.stringify(j.images)
        );
      });
      const journalsToDelete = state.deletedIds?.journals || [];

      // 6. Profile stats
      const prevProfile = { streak: lastSyncedState.streak, completionHistory: lastSyncedState.completionHistory, lastActiveDate: lastSyncedState.lastActiveDate };
      const currProfile = { streak: state.streak, completionHistory: state.completionHistory, lastActiveDate: state.lastActiveDate };
      const profileChanged = 
        prevProfile.streak !== currProfile.streak ||
        prevProfile.lastActiveDate !== currProfile.lastActiveDate ||
        JSON.stringify(prevProfile.completionHistory) !== JSON.stringify(currProfile.completionHistory);

      let hasSynced = false;

      // ─── EXECUTE DELTA DATABASE WRITES ───

      // 1. Sync lists
      if (listsToUpsert.length > 0) {
        const payloads = listsToUpsert.map(l => ({ id: l.id, user_id: userId, name: l.name }));
        const { error } = await client.from('lists').upsert(payloads, { onConflict: 'id' });
        if (error) console.error('Supabase upsert error [lists]:', error.message);
        hasSynced = true;
      }
      if (listsToDelete.length > 0) {
        const { error } = await client.from('lists').delete().in('id', listsToDelete);
        if (error) console.error('Supabase delete error [lists]:', error.message);
        hasSynced = true;
      }

      // 2. Sync tasks & subtasks
      if (tasksToUpsert.length > 0) {
        const payloads = tasksToUpsert.map(t => {
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
            list_id: (t.listId === 'toady' || !t.listId) ? null : (typeof t.listId === 'number' ? t.listId : t.listId),
            name: t.name,
            cat: t.cat || '',
            done: t.done,
            starred: t.starred || false,
            task_date: t.date || null,
            task_time: t.time || null,
            repeat_type: t.repeatType || 'none',
            repeat_value: parsedRepeatValue,
            deadline: t.deadline || null,
            details: t.details || null,
            created_at: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString()
          };
        });
        const { error } = await client.from('tasks').upsert(payloads, { onConflict: 'id' });
        if (error) console.error('Supabase upsert error [tasks]:', error.message);

        // relational subtasks upsert (only for tasks that actually changed!)
        const subtaskPayloads = tasksToUpsert.flatMap(t => 
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
          const activeTaskIds = tasksToUpsert.map(t => t.id);
          const { error: deleteErr } = await client
            .from('subtasks')
            .delete()
            .in('task_id', activeTaskIds)
            .not('id', 'in', `(${activeSubtaskIds.join(',')})`);
          if (deleteErr) console.error('Supabase subtask cleanup error:', deleteErr.message);
        } else {
          const activeTaskIds = tasksToUpsert.map(t => t.id);
          await client.from('subtasks').delete().in('task_id', activeTaskIds);
        }
        hasSynced = true;
      }
      if (tasksToDelete.length > 0) {
        const { error } = await client.from('tasks').delete().in('id', tasksToDelete);
        if (error) console.error('Supabase delete error [tasks]:', error.message);
        hasSynced = true;
      }

      // 3. Sync sessions
      if (sessionsToUpsert.length > 0) {
        const payloads = sessionsToUpsert.map(s => ({ id: s.id, user_id: userId, name: s.name, icon: s.icon, color: s.color, steps: s.steps }));
        const { error } = await client.from('sessions').upsert(payloads, { onConflict: 'id' });
        if (error) console.error('Supabase upsert error [sessions]:', error.message);
        hasSynced = true;
      }
      if (sessionsToDelete.length > 0) {
        const { error } = await client.from('sessions').delete().in('id', sessionsToDelete);
        if (error) console.error('Supabase delete error [sessions]:', error.message);
        hasSynced = true;
      }

      // 4. Sync goals
      if (goalsToUpsert.length > 0) {
        const payloads = goalsToUpsert.map(g => ({
          id: g.id,
          user_id: userId,
          type: g.type,
          name: g.name,
          target: g.type === 'static' ? 100 : (g as any).target,
          current: g.type === 'static' ? (g as any).progress : (g as any).current,
          emoji: (g as any).emoji || '🎯',
          note: (g as any).note || '',
          cat: (g as any).cat || 'other',
          progress: (g as any).progress || 0
        }));
        const { error } = await client.from('goals').upsert(payloads, { onConflict: 'id' });
        if (error) console.error('Supabase upsert error [goals]:', error.message);
        hasSynced = true;
      }
      if (goalsToDelete.length > 0) {
        const { error } = await client.from('goals').delete().in('id', goalsToDelete);
        if (error) console.error('Supabase delete error [goals]:', error.message);
        hasSynced = true;
      }

      // 5. Sync journals
      if (journalsToUpsert.length > 0) {
        const payloads = journalsToUpsert.map(j => {
          let parsedContent = [];
          try {
            parsedContent = typeof j.content === 'string' ? JSON.parse(j.content) : j.content;
            while (typeof parsedContent === 'string') {
              parsedContent = JSON.parse(parsedContent);
            }
          } catch (e) {
            console.error("Failed to parse journal content for sync:", e);
            parsedContent = [{ id: '1', type: 'text', content: j.content || '', indent: 0 }];
          }
          return {
            id: j.id,
            user_id: userId,
            title: j.title || '',
            content: parsedContent,
            bookmarked: j.bookmarked || false,
            location: j.location || null,
            images: Array.isArray(j.images) ? j.images : [],
            draft: j.draft || false,
            created_at: j.created_at || new Date().toISOString()
          };
        });
        const { error } = await client.from('journals').upsert(payloads, { onConflict: 'id' });
        if (error) console.error('Supabase upsert error [journals]:', error.message);
        hasSynced = true;
      }
      if (journalsToDelete.length > 0) {
        const { error } = await client.from('journals').delete().in('id', journalsToDelete);
        if (error) console.error('Supabase delete error [journals]:', error.message);
        hasSynced = true;
      }

      // 6. Sync profile
      if (profileChanged) {
        const { error } = await client.from('profiles').upsert({
          id: userId,
          streak: state.streak || 0,
          completion_history: state.completionHistory || {},
          last_active_date: state.lastActiveDate || new Date().toDateString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
        if (error) console.error('Supabase upsert error [profiles]:', error.message);
        hasSynced = true;
      }

      // Baseline synced state
      lastSyncedState = JSON.parse(JSON.stringify(state));

      // Reset deletedIds state locally in one single update
      if (storeRef) {
        storeRef.setState({
          deletedIds: { tasks: [], sessions: [], goals: [], journals: [], lists: [] }
        }, true);
      }

      if (hasSynced) {
        console.log('✅ Supabase background sync: synced modified rows.');
      }
    } catch (e: any) {
      console.warn('Supabase background sync connection failed:', e.message);
    }
  }, 2000);
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
          createdAt: t.created_at ? new Date(t.created_at).getTime() : (typeof t.id === 'number' ? Number(t.id) : Date.now()),
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
      newState.journals = journalsData.map((j: any) => {
        let contentStr = '[]';
        if (j.content) {
          if (typeof j.content === 'string') {
            try {
              let parsed = JSON.parse(j.content);
              while (typeof parsed === 'string') {
                parsed = JSON.parse(parsed);
              }
              contentStr = JSON.stringify(parsed);
            } catch {
              contentStr = j.content;
            }
          } else {
            contentStr = JSON.stringify(j.content);
          }
        }

        let imagesArr: string[] = [];
        if (j.images) {
          if (Array.isArray(j.images)) {
            imagesArr = j.images;
          } else if (typeof j.images === 'string') {
            try {
              imagesArr = JSON.parse(j.images);
            } catch {}
          }
        }

        return {
          id: Number(j.id),
          title: j.title || '',
          content: contentStr,
          bookmarked: j.bookmarked || false,
          location: j.location || '',
          images: imagesArr,
          created_at: j.created_at,
          draft: j.draft || false
        };
      });
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

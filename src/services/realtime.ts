import { type RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { store } from './db';
import { type AppState } from '../types';

let realtimeChannel: RealtimeChannel | null = null;

export function setupRealtimeSubscription(userId: string): void {
  if (!supabase || realtimeChannel) return;

  console.log('Setting up Supabase Realtime subscription for user:', userId);

  realtimeChannel = supabase.channel(`realtime-db-changes-${userId}`);

  // Helper to handle updates for standard tables
  const handleTableChange = <K extends keyof AppState>(
    table: string, 
    stateKey: K, 
    mapRow: (row: any) => AppState[K] extends (infer U)[] ? U : AppState[K]
  ) => {
    if (!realtimeChannel) return;
    
    realtimeChannel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: table },
      (payload: any) => {
        // Safe check for user ID ownership (realtime RLS policies filter this automatically, but extra check is good)
        if (payload.new && payload.new.user_id && payload.new.user_id !== userId) return;
        if (payload.old && payload.old.user_id && payload.old.user_id !== userId) return;

        const currentState = store.getState();
        const currentItems = (currentState[stateKey] as any) || [];

        if (payload.eventType === 'INSERT') {
          const newItem = mapRow(payload.new);
          if (!currentItems.some((item: any) => Number(item.id) === Number((newItem as any).id))) {
            store.setState({ [stateKey]: [...currentItems, newItem] }, true);
          }
        } else if (payload.eventType === 'UPDATE') {
          const updatedItem = mapRow(payload.new);
          let itemFound = false;
          const updatedItems = currentItems.map((item: any) => {
            if (Number(item.id) === Number((updatedItem as any).id)) {
              itemFound = true;
              return { ...item, ...(updatedItem as any) };
            }
            return item;
          });
          if (!itemFound) {
            updatedItems.push(updatedItem);
          }
          store.setState({ [stateKey]: updatedItems }, true);
        } else if (payload.eventType === 'DELETE') {
          const deletedId = Number(payload.old.id);
          const updatedItems = currentItems.filter((item: any) => Number(item.id) !== deletedId);
          store.setState({ [stateKey]: updatedItems }, true);
        }
      }
    );
  };

  // 0. Subscribe to Lists
  handleTableChange('lists', 'lists', row => ({
    id: Number(row.id),
    name: row.name
  }));

  // 1. Subscribe to Tasks
  handleTableChange('tasks', 'tasks', row => {
    let repeatValStr = '';
    if (row.repeat_value) {
      try {
        repeatValStr = typeof row.repeat_value === 'string' ? row.repeat_value : JSON.stringify(row.repeat_value);
      } catch {}
    }
    return {
      id: Number(row.id),
      name: row.name,
      done: row.done,
      starred: row.starred || false,
      listId: row.list_id ? Number(row.list_id) : null,
      cat: row.cat || '',
      date: row.task_date || undefined,
      time: row.task_time || undefined,
      repeatType: row.repeat_type || 'none',
      repeatValue: repeatValStr,
      deadline: row.deadline || undefined,
      details: row.details || undefined,
      createdAt: row.created_at ? new Date(row.created_at).getTime() : (typeof row.id === 'number' ? Number(row.id) : Date.now())
    };
  });

  // 1b. Subscribe to Subtasks (updates nested subtasks array on matching task)
  if (realtimeChannel) {
    realtimeChannel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'subtasks' },
      (payload: any) => {
        const currentState = store.getState();
        const mapSubtask = (row: any) => ({
          id: Number(row.id),
          name: row.name,
          done: row.done
        });

        if (payload.eventType === 'INSERT') {
          const row = payload.new;
          const taskId = Number(row.task_id);
          const newSub = mapSubtask(row);

          const updatedTasks = currentState.tasks.map(t => {
            if (t.id === taskId) {
              const subs = t.subtasks || [];
              if (!subs.some(s => s.id === newSub.id)) {
                return { ...t, subtasks: [...subs, newSub] };
              }
            }
            return t;
          });
          store.setState({ tasks: updatedTasks }, true);
        } else if (payload.eventType === 'UPDATE') {
          const row = payload.new;
          const taskId = Number(row.task_id);
          const updatedSub = mapSubtask(row);

          const updatedTasks = currentState.tasks.map(t => {
            if (t.id === taskId) {
              const subs = (t.subtasks || []).map(s => 
                s.id === updatedSub.id ? { ...s, ...updatedSub } : s
              );
              return { ...t, subtasks: subs };
            }
            return t;
          });
          store.setState({ tasks: updatedTasks }, true);
        } else if (payload.eventType === 'DELETE') {
          const row = payload.old;
          const deletedId = Number(row.id);

          const updatedTasks = currentState.tasks.map(t => {
            if (t.subtasks && t.subtasks.some(s => s.id === deletedId)) {
              return { ...t, subtasks: t.subtasks.filter(s => s.id !== deletedId) };
            }
            return t;
          });
          store.setState({ tasks: updatedTasks }, true);
        }
      }
    );
  }

  // 2. Subscribe to Sessions
  handleTableChange('sessions', 'sessions', row => ({
    id: Number(row.id),
    name: row.name,
    icon: row.icon,
    color: row.color,
    steps: row.steps,
    open: false // Default open state to false when fetched/synced
  }));

  // 5. Subscribe to Journals
  handleTableChange('journals', 'journals', row => {
    let contentStr = '[]';
    if (row.content) {
      contentStr = typeof row.content === 'string' ? row.content : JSON.stringify(row.content);
    }
    let imagesArr: string[] = [];
    if (row.images) {
      if (Array.isArray(row.images)) {
        imagesArr = row.images;
      } else if (typeof row.images === 'string') {
        try {
          imagesArr = JSON.parse(row.images);
        } catch {}
      }
    }
    return {
      id: Number(row.id),
      title: row.title || '',
      content: contentStr,
      bookmarked: row.bookmarked || false,
      location: row.location || '',
      images: imagesArr,
      created_at: row.created_at,
      draft: row.draft || false
    };
  });

  // 6. Subscribe to Goals (requires custom split since they populate weekly, monthly, or static in state)
  realtimeChannel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'goals' },
    (payload: any) => {
      if (payload.new && payload.new.user_id && payload.new.user_id !== userId) return;
      if (payload.old && payload.old.user_id && payload.old.user_id !== userId) return;

      const currentState = store.getState();
      
      const getTargetListKey = (type: string): 'weekly' | 'monthly' | 'static' | null => {
        if (type === 'weekly') return 'weekly';
        if (type === 'monthly') return 'monthly';
        if (type === 'static') return 'static';
        return null;
      };

      const mapGoal = (row: any) => {
        if (row.type === 'static') {
          return {
            id: Number(row.id),
            name: row.name,
            emoji: row.emoji,
            note: row.note,
            cat: row.cat,
            progress: row.progress || 0
          };
        }
        return {
          id: Number(row.id),
          name: row.name,
          target: row.target,
          current: row.current
        };
      };

      if (payload.eventType === 'INSERT') {
        const row = payload.new;
        const listKey = getTargetListKey(row.type);
        if (!listKey) return;
        const items = currentState[listKey] || [];
        const newItem = mapGoal(row);
        if (!items.some((item: any) => Number(item.id) === Number(newItem.id))) {
          store.setState({ [listKey]: [...items, newItem] }, true);
        }
      } else if (payload.eventType === 'UPDATE') {
        const row = payload.new;
        const listKey = getTargetListKey(row.type);
        if (!listKey) return;
        const items = currentState[listKey] || [];
        const updatedItem = mapGoal(row);
        let itemFound = false;
        const updatedItems = items.map((item: any) => {
          if (Number(item.id) === Number(updatedItem.id)) {
            itemFound = true;
            return { ...item, ...updatedItem };
          }
          return item;
        });
        if (!itemFound) {
          updatedItems.push(updatedItem);
        }
        store.setState({ [listKey]: updatedItems }, true);
      } else if (payload.eventType === 'DELETE') {
        const deletedId = Number(payload.old.id);
        // Since we don't receive type on delete (unless replica identity is FULL),
        // we can filter out from weekly, monthly, and static goals safely since IDs are unique.
        store.setState({
          weekly: (currentState.weekly || []).filter((item: any) => Number(item.id) !== deletedId),
          monthly: (currentState.monthly || []).filter((item: any) => Number(item.id) !== deletedId),
          static: (currentState.static || []).filter((item: any) => Number(item.id) !== deletedId)
        }, true);
      }
    }
  );

  // 7. Subscribe to Profiles (Updates streak, completionHistory, and lastActiveDate)
  realtimeChannel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'profiles' },
    (payload: any) => {
      if (payload.new && payload.new.id !== userId) return;
      if (payload.old && payload.old.id !== userId) return;

      if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
        const row = payload.new;
        store.setState({
          streak: row.streak,
          completionHistory: row.completion_history,
          lastActiveDate: row.last_active_date
        }, true);
      }
    }
  );

  realtimeChannel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log('Realtime database changes subscribed successfully.');
    } else {
      console.warn('Realtime channel subscription status change:', status);
    }
  });
}

export function cleanupRealtimeSubscription(): void {
  if (realtimeChannel && supabase) {
    console.log('Cleaning up Supabase Realtime subscription...');
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
}

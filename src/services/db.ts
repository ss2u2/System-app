// Local state store with automatic LocalStorage caching and daily reset behavior.
import { triggerSync, registerStore, setLastSyncedState } from './sync';
import type { AppState, AppStore } from '../types';
import { generateSecureNumericId, convertBlocksToHtml } from '../utils/taskHelper';


const LOCAL_STORAGE_KEY = 'system_app_state';

const defaultState: AppState = {
  sessions: [
    {id: 1, name: 'Morning Exercise', icon: '🏋️', color: 'green', steps: [
      {name: 'Stretch', dur: '5 min', done: false},
      {name: 'Facial Exercise', dur: '10 min', done: false},
      {name: 'Cardio', dur: '15 min', done: false}
    ], open: false},
    {id: 2, name: 'Deep Work', icon: '💻', color: 'blue', steps: [
      {name: 'Brain dump', dur: '5 min', done: false},
      {name: 'Priority task', dur: '45 min', done: false},
      {name: 'Review & plan', dur: '10 min', done: false}
    ], open: false}
  ],
  tasks: [
    {id: 1, name: 'Read 20 pages', cat: 'mind', done: false},
    {id: 2, name: 'Reply to emails', cat: 'work', done: false},
    {id: 3, name: 'Meditate', cat: 'mind', done: false},
    // Seed Tasks linked to default lists
    {id: 2001, name: 'take throat medicine for samriti', cat: '', listId: 1001, starred: false, createdAt: Date.now() - 3 * 365 * 24 * 3600 * 1000, done: false},
    {id: 2002, name: 'Harsh birthday', cat: '', listId: 1001, starred: false, createdAt: Date.now() - 4 * 365 * 24 * 3600 * 1000, done: false},
    {id: 2003, name: 'Setup IDE environment', cat: '', listId: 1001, starred: false, createdAt: Date.now() - 5 * 24 * 3600 * 1000, done: true},
    {id: 2004, name: 'Configure supabase sync', cat: '', listId: 1001, starred: false, createdAt: Date.now() - 4 * 24 * 3600 * 1000, done: true},
    {id: 2005, name: 'Integrate Notebook editor', cat: '', listId: 1001, starred: false, createdAt: Date.now() - 3 * 24 * 3600 * 1000, done: true},
    {id: 2006, name: 'Implement calendar goals', cat: '', listId: 1001, starred: false, createdAt: Date.now() - 2 * 24 * 3600 * 1000, done: true},
    {id: 2007, name: 'Refactor DB caching', cat: '', listId: 1001, starred: false, createdAt: Date.now() - 1 * 24 * 3600 * 1000, done: true},
    {id: 2008, name: 'Write documentation walkthrough', cat: '', listId: 1001, starred: false, createdAt: Date.now() - 12 * 3600 * 1000, done: true},
    {id: 3001, name: 'Review client feedback', cat: '', listId: 1002, starred: false, createdAt: Date.now() - 2 * 3600 * 1000, done: false},
    {id: 3002, name: 'Update design mockup', cat: '', listId: 1002, starred: false, createdAt: Date.now() - 4 * 3600 * 1000, done: false},
    {id: 3003, name: 'Plan product sprint', cat: '', listId: 1002, starred: false, createdAt: Date.now() - 1 * 24 * 3600 * 1000, done: false},
    {id: 3004, name: 'Fix layout styling bugs', cat: '', listId: 1002, starred: false, createdAt: Date.now() - 2 * 24 * 3600 * 1000, done: false},
    {id: 3005, name: 'Draft marketing copy', cat: '', listId: 1002, starred: false, createdAt: Date.now() - 3 * 24 * 3600 * 1000, done: false},
    {id: 3006, name: 'Coordinate launch timeline', cat: '', listId: 1002, starred: false, createdAt: Date.now() - 5 * 24 * 3600 * 1000, done: false},
    {id: 4001, name: 'Review pull requests', cat: '', listId: 1003, starred: false, createdAt: Date.now() - 600 * 1000, done: false}
  ],
  lists: [
    {id: 1001, name: 'My Tasks'},
    {id: 1002, name: 'roz'},
    {id: 1003, name: 'rr'}
  ],

  notebooks: [
    {
      id: 20001,
      title: 'Catching butterflies in the park',
      content: '<div>What a fantastic day! Prioritizing family time in nature is such a great way to relax. Keep capturing these moments.</div>',
      bookmarked: true,
      location: 'City Park Conservatory',
      images: [
        'https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=600&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=300&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=300&auto=format&fit=crop'
      ],
      created_at: new Date('2026-06-18T10:00:00.000Z').toISOString()
    },
    {
      id: 20002,
      title: 'Read Android Authority',
      content: '<div>Catching up on the latest tech news. Android 17 features look very promising, especially the revised widget system and theme engines.</div>',
      bookmarked: true,
      location: 'Home Library',
      created_at: new Date('2026-03-17T15:30:00.000Z').toISOString()
    },
    {
      id: 20003,
      title: '',
      content: '<div>Drafting thoughts on my new project ideas. I need to define the database schema and layout mockups before coding.</div>',
      bookmarked: false,
      location: '',
      created_at: new Date('2025-06-16T12:00:00.000Z').toISOString()
    },
    {
      id: 20004,
      title: 'Today is the day I have...',
      content: '<div>Had a great coffee and began designing the new database migration patterns. Feeling motivated today!</div>',
      bookmarked: false,
      location: 'Coffee Shop',
      created_at: new Date('2026-03-17T09:15:00.000Z').toISOString()
    }
  ],
  completionHistory: {
    // Populate some fake history for 14-day activity chart
    [getPastDateString(13)]: 80,
    [getPastDateString(12)]: 100,
    [getPastDateString(11)]: 100,
    [getPastDateString(10)]: 60,
    [getPastDateString(9)]: 90,
    [getPastDateString(8)]: 100,
    [getPastDateString(7)]: 100,
    [getPastDateString(6)]: 0,
    [getPastDateString(5)]: 100,
    [getPastDateString(4)]: 100,
    [getPastDateString(3)]: 85,
    [getPastDateString(2)]: 0,
    [getPastDateString(1)]: 100,
  },
  activityLogs: [],
  streak: 7,
  lastActiveDate: new Date().toDateString(),
  deletedIds: {
    tasks: [],
    sessions: [],
    notebooks: [],
    lists: []
  }
};

function getPastDateString(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toDateString();
}

// Cryptographic helpers for securing LocalStorage
function rc4(key: string, str: string): string {
  const s: number[] = [];
  for (let i = 0; i < 256; i++) {
    s[i] = i;
  }
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + s[i] + key.charCodeAt(i % key.length)) % 256;
    const temp = s[i];
    s[i] = s[j];
    s[j] = temp;
  }
  let i = 0;
  j = 0;
  let res = '';
  for (let y = 0; y < str.length; y++) {
    i = (i + 1) % 256;
    j = (j + s[i]) % 256;
    const temp = s[i];
    s[i] = s[j];
    s[j] = temp;
    const k = s[(s[i] + s[j]) % 256];
    res += String.fromCharCode(str.charCodeAt(y) ^ k);
  }
  return res;
}

function getEncryptionKey(): string {
  try {
    const supabaseKey = 'sb-baoyolgpsfsczwffildv-auth-token';
    const rawSession = localStorage.getItem(supabaseKey);
    if (rawSession) {
      const parsed = JSON.parse(rawSession);
      if (parsed?.user?.id) {
        return parsed.user.id;
      }
    }
  } catch (e) {
    console.warn("Failed to retrieve user ID for encryption key:", e);
  }
  return 'system_app_default_fallback_key_2026';
}

function encryptState(stateStr: string, secretKey: string): string {
  try {
    const encrypted = rc4(secretKey, stateStr);
    return btoa(unescape(encodeURIComponent(encrypted)));
  } catch (e) {
    console.error("Encryption failed:", e);
    return stateStr;
  }
}

function decryptState(cipherText: string, secretKey: string): string {
  try {
    const encrypted = decodeURIComponent(escape(atob(cipherText)));
    return rc4(secretKey, encrypted);
  } catch (e) {
    console.error("Decryption failed:", e);
    return cipherText;
  }
}

function migrateUuidIds(s: AppState): AppState {
  let migrated = false;
  
  // 1. Lists migration mapping
  const listIdMap: Record<string | number, number> = {};
  const migratedLists = (s.lists || []).map(list => {
    const numericId = Number(list.id);
    if (isNaN(numericId)) {
      const newId = generateSecureNumericId();
      listIdMap[list.id] = newId;
      migrated = true;
      return { ...list, id: newId };
    }
    return { ...list, id: numericId };
  });

  // 2. Sessions migration
  const migratedSessions = (s.sessions || []).map(sess => {
    const numericId = Number(sess.id);
    if (isNaN(numericId)) {
      migrated = true;
      return { ...sess, id: generateSecureNumericId() };
    }
    return { ...sess, id: numericId };
  });



  const migratedNotebooks = (s.notebooks || (s as any).diaries || (s as any).journals || []).map(j => {
    let content = j.content;
    let contentChanged = false;
    try {
      let parsed = content;
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }
      while (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }
      if (Array.isArray(parsed)) {
        content = convertBlocksToHtml(parsed);
        contentChanged = true;
      }
    } catch {
      // If it's a plain string, keep it as is
    }

    let images = j.images || [];
    let imagesChanged = false;
    if (typeof images === 'string') {
      try {
        images = JSON.parse(images);
        imagesChanged = true;
      } catch {
        images = [];
        imagesChanged = true;
      }
    }

    const draft = j.draft || false;
    const draftChanged = j.draft !== draft;

    const numericId = Number(j.id);
    if (isNaN(numericId) || contentChanged || imagesChanged || draftChanged) {
      migrated = true;
      return {
        ...j,
        id: isNaN(numericId) ? generateSecureNumericId() : numericId,
        content,
        images,
        draft
      };
    }
    return j;
  });
  if ((s as any).diaries || (s as any).journals) {
    migrated = true;
  }

  // 5. Tasks migration
  const migratedTasks = (s.tasks || []).map(task => {
    let changed = false;
    let newId = task.id;
    let newListId = task.listId;
    
    // Check task id
    const numericTaskId = Number(task.id);
    if (isNaN(numericTaskId)) {
      newId = generateSecureNumericId();
      changed = true;
      migrated = true;
    } else {
      newId = numericTaskId;
    }

    // Check listId
    if (task.listId !== undefined && task.listId !== null && task.listId !== 'toady') {
      if (listIdMap[task.listId]) {
        newListId = listIdMap[task.listId];
        changed = true;
        migrated = true;
      } else {
        const numericListId = Number(task.listId);
        if (isNaN(numericListId)) {
          newListId = 'toady';
          changed = true;
          migrated = true;
        } else {
          newListId = numericListId;
        }
      }
    }

    // Check subtasks
    const migratedSubtasks = task.subtasks || [];
    const newSubtasks = migratedSubtasks.map(st => {
      const numericStId = Number(st.id);
      if (isNaN(numericStId)) {
        migrated = true;
        changed = true;
        return { ...st, id: generateSecureNumericId() };
      }
      return { ...st, id: numericStId };
    });

    if (changed || typeof task.id !== 'number' || (task.listId !== undefined && task.listId !== null && typeof task.listId !== 'number' && task.listId !== 'toady')) {
      return {
        ...task,
        id: newId,
        listId: newListId,
        subtasks: newSubtasks
      };
    }
    return task;
  });

  // 6. Clean deletedIds of invalid string values to avoid DB cast failures on delete queries
  let cleanDeleted = s.deletedIds;
  if (s.deletedIds) {
    cleanDeleted = {
      tasks: (s.deletedIds.tasks || []).map(Number).filter(n => !isNaN(n)),
      sessions: (s.deletedIds.sessions || []).map(Number).filter(n => !isNaN(n)),
      notebooks: (s.deletedIds.notebooks || (s.deletedIds as any).diaries || (s.deletedIds as any).journals || []).map(Number).filter(n => !isNaN(n)),
      lists: (s.deletedIds.lists || []).map(Number).filter(n => !isNaN(n))
    };
    if (JSON.stringify(s.deletedIds) !== JSON.stringify(cleanDeleted) || (s.deletedIds as any).diaries || (s.deletedIds as any).journals) {
      migrated = true;
    }
  }

  if (migrated) {
    console.log("Migrated legacy string UUIDs to secure numeric IDs for database sync compatibility.");
    const cleanedState: any = {
      ...s,
      lists: migratedLists,
      sessions: migratedSessions,
      notebooks: migratedNotebooks,
      tasks: migratedTasks,
      deletedIds: cleanDeleted
    };
    delete cleanedState.diaries;
    delete cleanedState.journals;
    return cleanedState as AppState;
  }
  return s;
}

// Loads state and handles daily checks
function loadInitialState(): AppState {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return defaultState;
    
    const key = getEncryptionKey();
    let parsed: AppState;
    
    if (raw.trim().startsWith('{')) {
      // Migrate legacy plaintext cache to encrypted
      parsed = JSON.parse(raw);
      parsed = migrateUuidIds(parsed);
      localStorage.setItem(LOCAL_STORAGE_KEY, encryptState(JSON.stringify(parsed), key));
    } else {
      // Decrypt and parse
      const decrypted = decryptState(raw, key);
      parsed = JSON.parse(decrypted);
      const migratedState = migrateUuidIds(parsed);
      if (migratedState !== parsed) {
        parsed = migratedState;
        localStorage.setItem(LOCAL_STORAGE_KEY, encryptState(JSON.stringify(parsed), key));
      }
    }
    
    // Fallback for schema updates
    parsed.lists = parsed.lists || [
      {id: 1001, name: 'My Tasks'},
      {id: 1002, name: 'roz'},
      {id: 1003, name: 'rr'}
    ];
    parsed.lists = [...parsed.lists].sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0));
    if (!parsed.deletedIds) {
      parsed.deletedIds = { tasks: [], sessions: [], notebooks: [], lists: [] };
    } else {
      parsed.deletedIds.lists = parsed.deletedIds.lists || [];
      if ((parsed.deletedIds as any).diaries) {
        parsed.deletedIds.notebooks = [...(parsed.deletedIds.notebooks || []), ...(parsed.deletedIds as any).diaries];
        delete (parsed.deletedIds as any).diaries;
      }
      if ((parsed.deletedIds as any).journals) {
        parsed.deletedIds.notebooks = [...(parsed.deletedIds.notebooks || []), ...(parsed.deletedIds as any).journals];
        delete (parsed.deletedIds as any).journals;
      }
    }
    
    // Check if new day has arrived
    const todayStr = new Date().toDateString();
    let isNewDay = parsed.lastActiveDate !== todayStr;
    
    if (isNewDay && parsed.lastActiveDate) {
      try {
        if (parsed.lastActiveDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [y, m, d] = parsed.lastActiveDate.split('-');
          if (new Date(Number(y), Number(m) - 1, Number(d)).toDateString() === todayStr) {
            isNewDay = false;
          }
        } else {
          const d = new Date(parsed.lastActiveDate);
          if (!isNaN(d.getTime()) && d.toDateString() === todayStr) {
            isNewDay = false;
          }
        }
      } catch {}
    }

    if (isNewDay) {
      // 1. Calculate and record yesterday's completion percentage
      const yesterday = parsed.lastActiveDate || getPastDateString(1);
      const score = calculateScore(parsed);
      
      parsed.completionHistory = {
        ...parsed.completionHistory,
        [yesterday]: score
      };
      
      // 2. Adjust streak
      if (score === 0) {
        parsed.streak = 0;
      } else {
        parsed.streak = (parsed.streak || 0) + 1;
      }
      
      // 3. Reset daily items
      parsed.tasks = parsed.tasks.map(t => ({ ...t, done: false }));
      const todayDayOfWeek = new Date().getDay();
      parsed.sessions = parsed.sessions.map(s => {
        const isScheduledToday = !s.repeatType || s.repeatType === 'daily' || (s.repeatType === 'weekly' && s.repeatDays?.includes(todayDayOfWeek));
        if (isScheduledToday) {
          return {
            ...s,
            steps: s.steps.map(st => ({ ...st, done: false, currentCount: 0 }))
          };
        }
        return s;
      });
      
      // Update date
      parsed.lastActiveDate = todayStr;
      
      // Save updated state encrypted
      localStorage.setItem(LOCAL_STORAGE_KEY, encryptState(JSON.stringify(parsed), key));
    }
    
    return parsed;
  } catch (e) {
    console.error("Failed to load local storage state:", e);
    return defaultState;
  }
}

function calculateScore(s: AppState): number {
  const all = [...(s.sessions || []).flatMap(sess => sess.steps || []), ...(s.tasks || [])];
  const done = all.filter(x => x.done).length;
  return all.length ? Math.round((done / all.length) * 100) : 0;
}

type StoreListener = (state: AppState) => void;
let listeners: StoreListener[] = [];
let state: AppState = loadInitialState();

export const store: AppStore = {
  getState() {
    return state;
  },
  setState(newState: Partial<AppState> | { _reset: boolean }, fromRemote = false) {
    if (newState && (newState as any)._reset) {
      state = JSON.parse(JSON.stringify(defaultState));
    } else {
      const today = new Date();
      // standard YYYY-MM-DD local time
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      let newLogs = [...(state.activityLogs || [])];
      let logsChanged = false;

      // Detect Task Completions
      if ((newState as AppState).tasks) {
        (newState as AppState).tasks.forEach(newTask => {
          const oldTask = state.tasks?.find(t => t.id === newTask.id);
          if (oldTask && !oldTask.done && newTask.done) {
            if (!newLogs.some(l => l.itemId === newTask.id && l.itemType === 'task' && l.date === todayStr && l.action === 'completed')) {
              newLogs.push({
                id: generateSecureNumericId().toString(),
                date: todayStr,
                itemId: newTask.id,
                itemType: 'task',
                action: 'completed',
                name: newTask.name
              });
              logsChanged = true;
            }
          } else if (oldTask && oldTask.done && !newTask.done) {
            const idx = newLogs.findIndex(l => String(l.itemId) === String(newTask.id) && l.itemType === 'task' && l.date === todayStr && l.action === 'completed');
            if (idx !== -1) {
              const deletedLog = newLogs[idx];
              newLogs.splice(idx, 1);
              logsChanged = true;
              if (deletedLog.id) {
                if (!state.deletedIds) state.deletedIds = { tasks: [], sessions: [], notebooks: [], lists: [], activityLogs: [] };
                if (!state.deletedIds.activityLogs) state.deletedIds.activityLogs = [];
                state.deletedIds.activityLogs.push(deletedLog.id);
              }
            }
          }
        });
      }

      // Detect Session Completions
      if ((newState as AppState).sessions) {
        (newState as AppState).sessions.forEach(newSession => {
          const oldSession = state.sessions?.find(s => s.id === newSession.id);
          if (oldSession) {
            const oldDone = oldSession.steps.length > 0 && oldSession.steps.every(st => st.done);
            const newDone = newSession.steps.length > 0 && newSession.steps.every(st => st.done);
            
            if (!oldDone && newDone) {
              if (!newLogs.some(l => l.itemId === newSession.id && l.itemType === 'session' && l.date === todayStr && l.action === 'completed')) {
                newLogs.push({
                  id: generateSecureNumericId().toString(),
                  date: todayStr,
                  itemId: newSession.id,
                  itemType: 'session',
                  action: 'completed',
                  name: newSession.name
                });
                logsChanged = true;
              }
            } else if (oldDone && !newDone) {
              const idx = newLogs.findIndex(l => String(l.itemId) === String(newSession.id) && l.itemType === 'session' && l.date === todayStr && l.action === 'completed');
              if (idx !== -1) {
                const deletedLog = newLogs[idx];
                newLogs.splice(idx, 1);
                logsChanged = true;
                if (deletedLog.id) {
                  if (!state.deletedIds) state.deletedIds = { tasks: [], sessions: [], notebooks: [], lists: [], activityLogs: [] };
                  if (!state.deletedIds.activityLogs) state.deletedIds.activityLogs = [];
                  state.deletedIds.activityLogs.push(deletedLog.id);
                }
              }
            }
          }
        });
      }
      
      const toMerge = logsChanged ? { ...newState, activityLogs: newLogs } : newState;
      state = { ...state, ...toMerge } as AppState;
    }
    
    // Save to local cache encrypted
    try {
      const key = getEncryptionKey();
      localStorage.setItem(LOCAL_STORAGE_KEY, encryptState(JSON.stringify(state), key));
    } catch (e) {
      console.error("Failed to write state to localStorage:", e);
    }
    
    // Notify React listeners
    listeners.forEach(l => l(state));
    
    // Trigger Supabase cloud synchronizer only if not from a remote update
    if (!fromRemote) {
      triggerSync();
    } else {
      setLastSyncedState(state);
    }
  },
  subscribe(listener: StoreListener) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }
};

registerStore(store);

// Local state store with automatic LocalStorage caching and daily reset behavior.
import { triggerSync, registerStore } from './sync';
import type { AppState, AppStore } from '../types';

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
    {id: 3, name: 'Meditate', cat: 'mind', done: false}
  ],
  weekly: [
    {id: 1, name: 'Exercise 5x this week', target: 5, current: 2},
    {id: 2, name: 'Read every day', target: 7, current: 4}
  ],
  monthly: [
    {id: 1, name: 'Finish online course', target: 20, current: 8},
    {id: 2, name: 'Run 50 km total', target: 50, current: 18}
  ],
  static: [
    {id: 1, name: 'Get in shape', emoji: '💪', note: 'Target: lose 10kg, build muscle', cat: 'health', progress: 35},
    {id: 2, name: 'Buy a car', emoji: '🚗', note: 'Save ₹3L — target by Dec 2025', cat: 'finance', progress: 52},
    {id: 3, name: 'Start my own business', emoji: '🚀', note: 'Build skills, save runway, launch by 2026', cat: 'career', progress: 20},
    {id: 4, name: 'Learn to play guitar', emoji: '🎸', note: 'Complete beginner course + 3 songs', cat: 'life', progress: 68}
  ],
  journals: [
    {id: 1, title: 'My first entry', content: JSON.stringify([
      { id: '1', type: 'text', content: 'Welcome to your journal! Type / to open the commands menu.', indent: 0 }
    ])}
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
  streak: 7,
  lastActiveDate: new Date().toDateString(),
  deletedIds: {
    tasks: [],
    sessions: [],
    goals: [],
    journals: []
  }
};

function getPastDateString(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toDateString();
}

// Loads state and handles daily checks
function loadInitialState(): AppState {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return defaultState;
    
    let parsed: AppState = JSON.parse(raw);
    
    // Check if new day has arrived
    const todayStr = new Date().toDateString();
    if (parsed.lastActiveDate !== todayStr) {
      // 1. Calculate and record yesterday's completion percentage
      const yesterday = parsed.lastActiveDate || getPastDateString(1);
      const score = calculateScore(parsed);
      
      parsed.completionHistory = {
        ...parsed.completionHistory,
        [yesterday]: score
      };
      
      // 2. Adjust streak
      // If they had a score > 0, they keep the streak. If score was 0, reset streak.
      if (score === 0) {
        parsed.streak = 0;
      } else {
        parsed.streak = (parsed.streak || 0) + 1;
      }
      
      // 3. Reset daily items
      parsed.tasks = parsed.tasks.map(t => ({ ...t, done: false }));
      parsed.sessions = parsed.sessions.map(s => ({
        ...s,
        steps: s.steps.map(st => ({ ...st, done: false }))
      }));
      
      // Update date
      parsed.lastActiveDate = todayStr;
      
      // Save updated state
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
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
      state = { ...state, ...newState } as AppState;
    }
    
    // Save to local cache
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Failed to write state to localStorage:", e);
    }
    
    // Notify React listeners
    listeners.forEach(l => l(state));
    
    // Trigger Supabase cloud synchronizer only if not from a remote update
    if (!fromRemote) {
      triggerSync(state);
    }
  },
  subscribe(listener: StoreListener) {
    listeners.push(listener);
    // Unsubscribe hook
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }
};

registerStore(store);

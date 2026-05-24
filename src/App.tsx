import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import AuthScreen from './components/AuthScreen';
import TopBar from './components/TopBar';
import BottomNav from './components/BottomNav';
import ToadyView from './screens/ToadyView';
import TasksView from './screens/TasksView';
import ProgressView from './screens/ProgressView';
import JournalView from './screens/JournalView';
import SyncConfig from './components/SyncConfig';
import TaskDetailView from './components/TaskDetailView';
import { store } from './services/db';
import type { AppState, Task } from './types';
import { getLocalDateString, getNextOccurrenceDate, generateSecureNumericId } from './utils/taskHelper';

// Theme Context moved to context/ThemeContext.tsx

/* ─── Loading splash shown while Supabase restores the session ─── */
function LoadingSplash() {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#0a0a0d',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', system-ui, sans-serif",
      gap: 16,
    }}>
      {/* Logo mark */}
      <div style={{
        width: 52, height: 52,
        background: 'linear-gradient(135deg, #7c6af7, #a594ff)',
        borderRadius: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(124,106,247,0.4)',
        animation: 'splashPulse 1.8s ease-in-out infinite',
      }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
        </svg>
      </div>
      <div style={{ fontSize: 13, color: '#3a3a45', letterSpacing: 1 }}>Loading…</div>
      <style>{`
        @keyframes splashPulse {
          0%, 100% { box-shadow: 0 8px 24px rgba(124,106,247,0.4); transform: scale(1); }
          50% { box-shadow: 0 8px 36px rgba(124,106,247,0.7); transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}

import AppContainer from './components/AppContainer';

/* ─── Inner app (rendered only when user is authenticated) ─── */
function AuthenticatedApp() {
  const [state, setState] = useState<AppState>(store.getState());
  const [activeTab, setActiveTab] = useState<string>('toady');
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [editingTaskId, setEditingTaskId] = useState<number | string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const unsubscribe = store.subscribe((newState) => {
      setState({ ...newState });
    });
    return unsubscribe;
  }, []);

  const handleGlobalToggleTask = (taskId: number | string) => {
    let newTaskToSpawn: Task | null = null;
    
    const updated = state.tasks.map(t => {
      if (t.id === taskId) {
        const isCompleting = !t.done;
        
        if (isCompleting && t.repeatType && t.repeatType !== 'none') {
          const currentDateStr = t.date || getLocalDateString();
          const nextDateStr = getNextOccurrenceDate(currentDateStr, t.repeatType, t.repeatValue || '');
          
          if (nextDateStr) {
            const newTaskId = generateSecureNumericId();
            let nextRepeatValue = t.repeatValue || '';
            
            if (t.repeatType === 'custom' && t.repeatValue) {
              try {
                const config = JSON.parse(t.repeatValue);
                if (config.ends === 'after') {
                  config.endsAfter = Number(config.endsAfter) - 1;
                  nextRepeatValue = JSON.stringify(config);
                }
              } catch (e) {
                console.error(e);
              }
            }
            
            const resetSubtasks = (t.subtasks || []).map((st: any) => ({ ...st, done: false }));
            
            newTaskToSpawn = {
              id: newTaskId,
              name: t.name,
              done: false,
              listId: t.listId,
              starred: t.starred || false,
              createdAt: Date.now(),
              date: nextDateStr,
              time: t.time,
              repeatType: t.repeatType,
              repeatValue: nextRepeatValue,
              deadline: t.deadline,
              details: t.details,
              subtasks: resetSubtasks,
              cat: ''
            };
          }
          
          return {
            ...t,
            repeatType: 'none',
            done: true
          };
        }
        
        return { ...t, done: !t.done };
      }
      return t;
    });
    
    if (newTaskToSpawn) {
      store.setState({ tasks: [...updated, newTaskToSpawn] });
    } else {
      store.setState({ tasks: updated });
    }
  };

  const handleGlobalDeleteTask = (taskId: number | string) => {
    const updated = state.tasks.filter(t => t.id !== taskId);
    const deletedIds = {
      ...(state.deletedIds || {}),
      tasks: [...(state.deletedIds?.tasks || []), taskId]
    };
    store.setState({ tasks: updated, deletedIds });
  };

  // Get active lists for TaskDetailView list selector
  const allLists = state.lists && state.lists.length > 0 ? state.lists : [{ id: 1001, name: 'My Tasks' }];

  return (
    <AppContainer>
      {/* 1. Header Bar */}
      <TopBar
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        activeTab={activeTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* 2. Scrollable Body Views */}
      <div className="app-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', minHeight: 0, overflow: 'hidden' }}>
        {activeTab === 'toady' && (
          <ToadyView
            state={state}
            onEditTask={setEditingTaskId}
            onToggleTask={handleGlobalToggleTask}
            onDeleteTask={handleGlobalDeleteTask}
          />
        )}

        {activeTab === 'tasks' && (
          <TasksView
            state={state}
            onEditTask={setEditingTaskId}
            onToggleTask={handleGlobalToggleTask}
            onDeleteTask={handleGlobalDeleteTask}
          />
        )}

        {activeTab === 'report' && (
          <ProgressView state={state} />
        )}

        {activeTab === 'journal' && (
          <JournalView state={state} searchQuery={searchQuery} />
        )}
      </div>

      {/* 3. Navigation Bar */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* ==================== OVERLAYS & RUNNERS ==================== */}

      {/* Account modal */}
      <SyncConfig
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
      />

      {/* Task Detail Overlay Screen */}
      {editingTaskId !== null && (
        <TaskDetailView
          taskId={editingTaskId}
          lists={allLists}
          onClose={() => setEditingTaskId(null)}
          onDelete={handleGlobalDeleteTask}
          onToggleComplete={handleGlobalToggleTask}
        />
      )}
    </AppContainer>
  );
}

/* ─── Auth Gate: decides what to render based on session state ─── */
function AuthGate() {
  const { user } = useAuth();

  // undefined = still checking session (Supabase hasn't responded yet)
  if (user === undefined) return <LoadingSplash />;

  // null = no session → show auth screen
  if (user === null) return <AuthScreen />;

  // user object = authenticated → show the app
  return <AuthenticatedApp />;
}

/* ─── Root export ─── */
export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AuthGate />
      </ThemeProvider>
    </AuthProvider>
  );
}

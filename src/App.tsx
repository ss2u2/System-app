import { useState, useEffect, createContext, useContext } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthScreen from './components/AuthScreen';
import TopBar from './components/TopBar';
import BottomNav from './components/BottomNav';
import ToadyView from './views/ToadyView';
import TasksView from './views/TasksView';
import ProgressView from './views/ProgressView';
import JournalView from './views/JournalView';
import SessionRunner from './views/SessionRunner';
import SyncConfig from './components/SyncConfig';
import { store } from './services/db';
import type { AppState } from './types';

// Theme Context Interface
interface ThemeContextType {
  theme: string;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType | null>(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

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

/* ─── Inner app (rendered only when user is authenticated) ─── */
function AuthenticatedApp() {
  const [state, setState] = useState<AppState>(store.getState());
  const [activeTab, setActiveTab] = useState<string>('toady');
  const [activeSessionIdx, setActiveSessionIdx] = useState<number | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = store.subscribe((newState) => {
      setState({ ...newState });
    });
    return unsubscribe;
  }, []);

  return (
    <div className="app-container">
      {/* 1. Header Bar */}
      <TopBar onOpenSyncModal={() => setIsSyncModalOpen(true)} activeTab={activeTab} />

      {/* 2. Scrollable Body Views */}
      <div className="app-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', minHeight: 0, overflow: 'hidden' }}>
        {activeTab === 'toady' && (
          <ToadyView
            state={state}
            onStartSession={(idx) => setActiveSessionIdx(idx)}
          />
        )}

        {activeTab === 'tasks' && (
          <TasksView
            state={state}
          />
        )}

        {activeTab === 'report' && (
          <ProgressView state={state} />
        )}

        {activeTab === 'journal' && (
          <JournalView state={state} />
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

      {/* Timed Session Runner */}
      {activeSessionIdx !== null && (
        <SessionRunner
          state={state}
          sessionIndex={activeSessionIdx}
          onClose={() => setActiveSessionIdx(null)}
        />
      )}
    </div>
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
  const [theme, setTheme] = useState<string>(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(t => t === 'light' ? 'dark' : 'light');
  };

  return (
    <AuthProvider>
      <ThemeContext.Provider value={{ theme, toggleTheme }}>
        <AuthGate />
      </ThemeContext.Provider>
    </AuthProvider>
  );
}

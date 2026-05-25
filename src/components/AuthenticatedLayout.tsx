import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import AppContainer from './AppContainer';
import SyncConfig from './SyncConfig';
import TaskDetailView from './TaskDetailView';
import { store } from '../services/db';
import type { AppState, Task } from '../types';
import { getLocalDateString, getNextOccurrenceDate, generateSecureNumericId } from '../utils/taskHelper';

export function AuthenticatedLayout() {
  const [state, setState] = useState<AppState>(store.getState());
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const location = useLocation();
  const navigate = useNavigate();
  const { taskId } = useParams();

  useEffect(() => {
    const unsubscribe = store.subscribe((newState) => {
      setState({ ...newState });
    });
    return unsubscribe;
  }, []);

  // Determine active tab based on route pathname
  const path = location.pathname;
  let activeTab = 'toady'; // default
  if (path.startsWith('/tasks')) {
    activeTab = 'tasks';
  } else if (path.startsWith('/report')) {
    activeTab = 'report';
  } else if (path.startsWith('/journal')) {
    activeTab = 'journal';
  }

  const handleGlobalToggleTask = (id: number | string) => {
    let newTaskToSpawn: Task | null = null;
    
    const updated = state.tasks.map(t => {
      if (t.id === id) {
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

  const handleGlobalDeleteTask = (id: number | string) => {
    const updated = state.tasks.filter(t => t.id !== id);
    const deletedIds = {
      ...(state.deletedIds || {}),
      tasks: [...(state.deletedIds?.tasks || []), id]
    };
    store.setState({ tasks: updated, deletedIds });
  };

  const handleCloseDetailView = () => {
    // Navigate back to the parent route (strip /detail/:taskId or /tasks/detail/:taskId)
    if (path.includes('/tasks')) {
      navigate('/tasks');
    } else {
      navigate('/');
    }
  };

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
        <Outlet context={{ state, searchQuery, setSearchQuery, handleGlobalToggleTask, handleGlobalDeleteTask }} />
      </div>

      {/* 3. Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'toady') navigate('/');
          else if (tab === 'tasks') navigate('/tasks');
          else if (tab === 'report') navigate('/report');
          else if (tab === 'journal') navigate('/journal');
        }}
      />

      {/* ==================== OVERLAYS & RUNNERS ==================== */}

      {/* Account sync modal */}
      <SyncConfig
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
      />

      {/* Task Detail Overlay Screen (driven by URL params) */}
      {taskId !== undefined && (
        <TaskDetailView
          taskId={taskId}
          lists={allLists}
          onClose={handleCloseDetailView}
          onDelete={handleGlobalDeleteTask}
          onToggleComplete={handleGlobalToggleTask}
        />
      )}
    </AppContainer>
  );
}

export default AuthenticatedLayout;

import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import AppContainer from './AppContainer';
import SyncConfig from './SyncConfig';
import TaskDetailView from './TaskDetailView';
import { useAppState } from '../hooks/useAppState';
import { store } from '../services/db';
import { getLocalDateString, getNextOccurrenceDate } from '../utils/taskHelper';

export function AuthenticatedLayout() {
  const state = useAppState(s => s);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const location = useLocation();
  const navigate = useNavigate();
  const { taskId } = useParams();


  // Determine active tab based on route pathname
  const path = location.pathname;
  let activeTab = 'toady'; // default
  if (path.startsWith('/tasks')) {
    activeTab = 'tasks';
  } else if (path.startsWith('/report')) {
    activeTab = 'report';
  } else if (path.startsWith('/notebook')) {
    activeTab = 'notebook';
  }

  // Animation direction logic
  const [slideClass, setSlideClass] = useState('slide-none');
  const prevTabIdxRef = useRef<number>(0);
  
  useEffect(() => {
    const tabOrder = ['toady', 'tasks', 'report', 'notebook'];
    const currentIdx = tabOrder.indexOf(activeTab);
    const prevIdx = prevTabIdxRef.current;
    
    if (currentIdx > prevIdx) {
      setSlideClass('tasks-container-animate-wrapper slide-right-to-left');
    } else if (currentIdx < prevIdx) {
      setSlideClass('tasks-container-animate-wrapper slide-left-to-right');
    }
    
    prevTabIdxRef.current = currentIdx;
    
    // Reset animation class after it plays so it can be re-triggered
    const timer = setTimeout(() => {
      setSlideClass('');
    }, 250);
    return () => clearTimeout(timer);
  }, [activeTab]);

  // Hash based modal closing
  useEffect(() => {
    if (location.hash !== '#account' && isSyncModalOpen) {
      setIsSyncModalOpen(false);
    }
  }, [location.hash]);

  const closeHashModal = (hash: string) => {
    if (location.hash === hash) navigate(-1);
  };

  const handleGlobalToggleTask = (id: number | string) => {
    const updated = state.tasks.map(t => {
      if (String(t.id) === String(id)) {
        return { ...t, done: !t.done };
      }
      return t;
    });
    
    store.setState({ tasks: updated });
  };

  // Automatically wake up completed repeating tasks and sessions when their next occurrence date arrives
  useEffect(() => {
    const checkRepeatingItems = () => {
      const currentState = store.getState();
      const currentTasks = currentState.tasks;
      const currentSessions = currentState.sessions;
      
      const todayStr = getLocalDateString();
      const todayDateString = new Date().toDateString();
      const todayDayOfWeek = new Date().getDay();
      
      let stateUpdates: any = {};
      
      // 1. Check Tasks
      if (currentTasks && currentTasks.length > 0) {
        let hasTaskChanges = false;
        const updatedTasks = currentTasks.map(t => {
          if (t.done && t.repeatType && t.repeatType !== 'none') {
            const currentDateStr = t.date || todayStr;
            const nextDateStr = getNextOccurrenceDate(currentDateStr, t.repeatType, t.repeatValue || '');
            
            if (nextDateStr && todayStr >= nextDateStr) {
              hasTaskChanges = true;
              
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
              
              return {
                ...t,
                done: false,
                date: nextDateStr,
                repeatValue: nextRepeatValue,
                subtasks: resetSubtasks
              };
            }
          }
          return t;
        });
        
        if (hasTaskChanges) {
          stateUpdates.tasks = updatedTasks;
        }
      }
      
      // 2. Check Sessions
      if (currentSessions && currentSessions.length > 0) {
        let hasSessionChanges = false;
        const updatedSessions = currentSessions.map(s => {
          const isScheduledToday = !s.repeatType || s.repeatType === 'daily' || (s.repeatType === 'weekly' && s.repeatDays?.includes(todayDayOfWeek));
          
          if (isScheduledToday && s.lastCompletedDate !== todayDateString) {
            const hasDoneSteps = s.steps.some(st => st.done);
            if (hasDoneSteps) {
              hasSessionChanges = true;
              return {
                ...s,
                steps: s.steps.map(st => ({ ...st, done: false, currentCount: 0 }))
              };
            }
          }
          return s;
        });
        
        if (hasSessionChanges) {
          stateUpdates.sessions = updatedSessions;
        }
      }
      
      if (Object.keys(stateUpdates).length > 0) {
        store.setState(stateUpdates);
      }
    };

    checkRepeatingItems();

    const intervalId = setInterval(checkRepeatingItems, 60000);
    return () => clearInterval(intervalId);
  }, [state.tasks, state.sessions]);

  const handleGlobalDeleteTask = (id: number | string) => {
    const updated = state.tasks.filter(t => String(t.id) !== String(id));
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
        onOpenSyncModal={() => { setIsSyncModalOpen(true); navigate('#account'); }}
        activeTab={activeTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* 2. Scrollable Body Views */}
      <div className="app-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', minHeight: 0, overflow: 'hidden' }}>
        <div key={activeTab} className={slideClass} style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Outlet context={{ state, searchQuery, setSearchQuery, handleGlobalToggleTask, handleGlobalDeleteTask }} />
        </div>
      </div>

      {/* 3. Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === activeTab) return;
          
          if (activeTab === 'toady') {
            // From Dashboard to Tab: Push
            const path = tab === 'tasks' ? '/tasks' : tab === 'report' ? '/report' : '/notebook';
            navigate(path);
          } else if (tab === 'toady') {
            // From Tab to Dashboard: Pop history to keep stack clean, or push if no history
            if (window.history.length > 1) {
              navigate(-1);
              // Fallback just in case navigate(-1) didn't go to dashboard (e.g. they landed directly on the tab)
              setTimeout(() => {
                if (window.location.pathname !== '/') {
                  navigate('/', { replace: true });
                }
              }, 100);
            } else {
              navigate('/');
            }
          } else {
            // From Tab to Tab: Replace
            const path = tab === 'tasks' ? '/tasks' : tab === 'report' ? '/report' : '/notebook';
            navigate(path, { replace: true });
          }
        }}
      />

      {/* ==================== OVERLAYS & RUNNERS ==================== */}

      {/* Account sync modal */}
      <SyncConfig
        isOpen={isSyncModalOpen}
        onClose={() => { setIsSyncModalOpen(false); closeHashModal('#account'); }}
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

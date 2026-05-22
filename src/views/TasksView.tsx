import React, { useState, useEffect, useRef } from 'react';
import {
  IconStar,
  IconStarFilled,
  IconPlus,
  IconDotsVertical,
  IconChevronDown,
  IconChevronUp,
  IconCheck,
  IconTrash,
  IconArrowsSort,
  IconCalendar,
} from '@tabler/icons-react';
import { store } from '../services/db';
import { useAuth } from '../context/AuthContext';
import type { AppState, Task } from '../types';

interface TasksViewProps {
  state: AppState;
  onOpenSyncModal: () => void;
}

export default function TasksView({ state, onOpenSyncModal }: TasksViewProps) {
  const { user } = useAuth();
  const [activeListId, setActiveListId] = useState<string | number>('1001'); // default to 'My Tasks' list
  const [isCompletedOpen, setIsCompletedOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'alpha'>('oldest');
  
  // Modals state
  const [isNewListOpen, setIsNewListOpen] = useState(false);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newTaskName, setNewTaskName] = useState('');
  const [menuOpenListId, setMenuOpenListId] = useState<string | number | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenListId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Seeding default lists and tasks if none exist
  useEffect(() => {
    const listDefs = (state.tasks || []).filter(t => t.cat === 'list-def');
    if (listDefs.length === 0) {
      const seedLists = [
        { id: 1001, name: 'My Tasks', cat: 'list-def', done: false },
        { id: 1002, name: 'roz', cat: 'list-def', done: false },
        { id: 1003, name: 'rr', cat: 'list-def', done: false }
      ];
      
      const now = Date.now();
      const seedTasks = [
        // My Tasks
        { id: 2001, name: 'take throat medicine for samriti', cat: `list-item|1001|false|${now - 3 * 365 * 24 * 3600 * 1000}`, done: false },
        { id: 2002, name: 'Harsh birthday', cat: `list-item|1001|false|${now - 4 * 365 * 24 * 3600 * 1000}`, done: false },
        
        // 6 Completed for My Tasks
        { id: 2003, name: 'Setup IDE environment', cat: `list-item|1001|false|${now - 5 * 24 * 3600 * 1000}`, done: true },
        { id: 2004, name: 'Configure supabase sync', cat: `list-item|1001|false|${now - 4 * 24 * 3600 * 1000}`, done: true },
        { id: 2005, name: 'Integrate Notion editor', cat: `list-item|1001|false|${now - 3 * 24 * 3600 * 1000}`, done: true },
        { id: 2006, name: 'Implement calendar goals', cat: `list-item|1001|false|${now - 2 * 24 * 3600 * 1000}`, done: true },
        { id: 2007, name: 'Refactor DB caching', cat: `list-item|1001|false|${now - 1 * 24 * 3600 * 1000}`, done: true },
        { id: 2008, name: 'Write documentation walkthrough', cat: `list-item|1001|false|${now - 12 * 3600 * 1000}`, done: true },
        
        // roz tasks (6 active)
        { id: 3001, name: 'Review client feedback', cat: `list-item|1002|false|${now - 2 * 3600 * 1000}`, done: false },
        { id: 3002, name: 'Update design mockup', cat: `list-item|1002|false|${now - 4 * 3600 * 1000}`, done: false },
        { id: 3003, name: 'Plan product sprint', cat: `list-item|1002|false|${now - 1 * 24 * 3600 * 1000}`, done: false },
        { id: 3004, name: 'Fix layout styling bugs', cat: `list-item|1002|false|${now - 2 * 24 * 3600 * 1000}`, done: false },
        { id: 3005, name: 'Draft marketing copy', cat: `list-item|1002|false|${now - 3 * 24 * 3600 * 1000}`, done: false },
        { id: 3006, name: 'Coordinate launch timeline', cat: `list-item|1002|false|${now - 5 * 24 * 3600 * 1000}`, done: false },

        // rr tasks (1 active)
        { id: 4001, name: 'Review pull requests', cat: `list-item|1003|false|${now - 600 * 1000}`, done: false }
      ];

      store.setState({ tasks: [...state.tasks, ...seedLists, ...seedTasks] });
    }
  }, [state.tasks]);

  // Parse lists and custom tasks
  const lists = (state.tasks || [])
    .filter(t => t.cat === 'list-def')
    .map(t => ({ id: t.id, name: t.name }));

  const allLists = lists.length > 0 ? lists : [{ id: 1001, name: 'My Tasks' }];

  const customTasks = (state.tasks || [])
    .filter(t => t.cat.startsWith('list-item|'))
    .map(t => {
      const parts = t.cat.split('|'); // list-item | listId | starred | createdAt
      return {
        id: t.id,
        listId: Number(parts[1]),
        starred: parts[2] === 'true',
        createdAt: Number(parts[3] || t.id),
        name: t.name,
        done: t.done
      };
    });

  // Calculate active task count per list
  const getActiveCount = (listId: number) => {
    return customTasks.filter(t => t.listId === listId && !t.done).length;
  };

  // Filter tasks based on active selection
  const filteredTasks = (() => {
    if (activeListId === 'starred') {
      return customTasks.filter(t => t.starred);
    }
    return customTasks.filter(t => t.listId === Number(activeListId));
  })();

  // Sort tasks
  const sortTasks = (tasksList: typeof customTasks) => {
    return [...tasksList].sort((a, b) => {
      if (sortOrder === 'newest') {
        return b.createdAt - a.createdAt;
      } else if (sortOrder === 'oldest') {
        return a.createdAt - b.createdAt;
      } else {
        return a.name.localeCompare(b.name);
      }
    });
  };

  const activeTasks = sortTasks(filteredTasks.filter(t => !t.done));
  const completedTasks = sortTasks(filteredTasks.filter(t => t.done));

  // Handlers
  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    const newListId = Date.now();
    const newListDef: Task = {
      id: newListId,
      name: newListName.trim(),
      cat: 'list-def',
      done: false
    };
    store.setState({ tasks: [...state.tasks, newListDef] });
    setNewListName('');
    setIsNewListOpen(false);
    setActiveListId(newListId);
  };

  const handleDeleteList = (listId: number) => {
    if (window.confirm('Are you sure you want to delete this list and all its tasks?')) {
      const updatedTasks = state.tasks.filter(t => {
        if (t.id === listId && t.cat === 'list-def') return false;
        if (t.cat.startsWith(`list-item|${listId}|`)) return false;
        return true;
      });
      store.setState({ tasks: updatedTasks });
      setActiveListId('1001'); // fallback to My Tasks
      setMenuOpenListId(null);
    }
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim()) return;
    
    // If currently on "Starred" section, add task to the default "My Tasks" list (1001) as starred
    const listId = activeListId === 'starred' ? 1001 : Number(activeListId);
    const isStarred = activeListId === 'starred';

    const newTaskId = Date.now();
    const newTask: Task = {
      id: newTaskId,
      name: newTaskName.trim(),
      cat: `list-item|${listId}|${isStarred}|${Date.now()}`,
      done: false
    };

    store.setState({ tasks: [...state.tasks, newTask] });
    setNewTaskName('');
    setIsNewTaskOpen(false);
  };

  const handleToggleTask = (taskId: number) => {
    const updated = state.tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, done: !t.done };
      }
      return t;
    });
    store.setState({ tasks: updated });
  };

  const handleToggleStar = (taskId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = state.tasks.map(t => {
      if (t.id === taskId && t.cat.startsWith('list-item|')) {
        const parts = t.cat.split('|');
        const starred = parts[2] === 'true';
        parts[2] = (!starred).toString();
        return { ...t, cat: parts.join('|') };
      }
      return t;
    });
    store.setState({ tasks: updated });
  };

  const handleDeleteTask = (taskId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = state.tasks.filter(t => t.id !== taskId);
    store.setState({ tasks: updated });
  };

  const handleToggleSort = () => {
    setSortOrder(prev => {
      if (prev === 'oldest') return 'newest';
      if (prev === 'newest') return 'alpha';
      return 'oldest';
    });
  };

  // Build initials for avatar
  const getInitials = () => {
    if (!user) return '?';
    const name = user.user_metadata?.full_name || user.user_metadata?.name;
    if (name) {
      return name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();
    }
    return user.email?.[0]?.toUpperCase() || '?';
  };

  const getAvatarUrl = () => {
    return user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  };

  // Convert creation timestamp to relative time string
  const getRelativeTimeString = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const secs = Math.floor(diff / 1000);
    const mins = Math.floor(secs / 60);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
    if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (mins > 0) return `${mins} min${mins > 1 ? 's' : ''} ago`;
    return 'just now';
  };

  // Get active list name
  const activeListName = (() => {
    if (activeListId === 'starred') return 'Starred Tasks';
    const list = allLists.find(l => l.id === Number(activeListId));
    return list ? list.name : 'Tasks';
  })();

  return (
    <div className="tasks-view-container">
      {/* 1. Header with Title & Avatar */}
      <div className="tasks-header">
        <h1 className="tasks-title">Tasks</h1>
        {user && (
          <button
            onClick={onOpenSyncModal}
            className="tasks-avatar-btn"
            title="Account Details"
          >
            <div className="tasks-avatar-inner">
              {getAvatarUrl() ? (
                <img src={getAvatarUrl()} alt="avatar" />
              ) : (
                getInitials()
              )}
            </div>
          </button>
        )}
      </div>

      {/* 2. Horizontally Scrollable List Tabs */}
      <div className="tasks-tabs-row">
        {/* Starred Tab */}
        <button
          className={`tasks-tab-item star-tab ${activeListId === 'starred' ? 'active' : ''}`}
          onClick={() => setActiveListId('starred')}
        >
          <IconStarFilled size={16} />
        </button>

        {/* Custom Lists Tabs */}
        {allLists.map(list => {
          const activeCount = getActiveCount(list.id);
          const isActive = activeListId === list.id;
          return (
            <button
              key={list.id}
              className={`tasks-tab-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveListId(list.id)}
            >
              <span className="tab-name">{list.name}</span>
              {activeCount > 0 && (
                <span className="tab-badge">{activeCount}</span>
              )}
            </button>
          );
        })}

        {/* Add List Tab */}
        <button
          className="tasks-tab-item add-list-tab"
          onClick={() => setIsNewListOpen(true)}
        >
          <IconPlus size={14} />
          <span>New list</span>
        </button>
      </div>

      {/* 3. Main Tasks Card Card */}
      <div className="tasks-card">
        {/* Card Header */}
        <div className="tasks-card-header">
          <span className="tasks-card-title">{activeListName}</span>
          <div className="tasks-card-actions" ref={menuRef}>
            {/* Sorting Toggle */}
            <button
              onClick={handleToggleSort}
              className="tasks-action-btn"
              title={`Sorted by: ${sortOrder} (Click to toggle)`}
            >
              <IconArrowsSort size={18} />
            </button>

            {/* List Option Menu (only if not Starred and not the default list 1001) */}
            {activeListId !== 'starred' && activeListId !== 1001 && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setMenuOpenListId(prev => prev === activeListId ? null : activeListId)}
                  className="tasks-action-btn"
                >
                  <IconDotsVertical size={18} />
                </button>
                {menuOpenListId === activeListId && (
                  <div className="tasks-dropdown-menu">
                    <button
                      onClick={() => handleDeleteList(Number(activeListId))}
                      className="dropdown-item danger"
                    >
                      <IconTrash size={14} />
                      Delete List
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Card Body - Active Tasks */}
        <div className="tasks-card-body">
          {activeTasks.length > 0 ? (
            <div className="custom-tasks-list">
              {activeTasks.map(t => (
                <div
                  key={t.id}
                  className="custom-task-row"
                  onClick={() => handleToggleTask(t.id)}
                >
                  {/* Circular Checkbox */}
                  <div className="custom-task-checkbox">
                    <div className="checkbox-inner" />
                  </div>

                  {/* Task details */}
                  <div className="custom-task-details">
                    <span className="custom-task-name">{t.name}</span>
                    <span className="custom-task-time">
                      <IconCalendar size={12} />
                      {getRelativeTimeString(t.createdAt)}
                    </span>
                  </div>

                  {/* Task row actions */}
                  <div className="custom-task-actions">
                    <button
                      onClick={(e) => handleToggleStar(t.id, e)}
                      className={`custom-task-star-btn ${t.starred ? 'active' : ''}`}
                    >
                      {t.starred ? <IconStarFilled size={18} /> : <IconStar size={18} />}
                    </button>
                    <button
                      onClick={(e) => handleDeleteTask(t.id, e)}
                      className="custom-task-delete-btn"
                    >
                      <IconTrash size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="tasks-empty-state">
              <span>No active tasks in this list</span>
            </div>
          )}

          {/* Completed Accordion Section */}
          {completedTasks.length > 0 && (
            <div className="completed-accordion">
              <button
                className="completed-header"
                onClick={() => setIsCompletedOpen(prev => !prev)}
              >
                <span>Completed ({completedTasks.length})</span>
                {isCompletedOpen ? (
                  <IconChevronUp size={16} />
                ) : (
                  <IconChevronDown size={16} />
                )}
              </button>

              {isCompletedOpen && (
                <div className="completed-body">
                  {completedTasks.map(t => (
                    <div
                      key={t.id}
                      className="custom-task-row done"
                      onClick={() => handleToggleTask(t.id)}
                    >
                      {/* Checkbox showing completed */}
                      <div className="custom-task-checkbox done">
                        <IconCheck size={10} strokeWidth={3} />
                      </div>

                      <div className="custom-task-details">
                        <span className="custom-task-name">{t.name}</span>
                        <span className="custom-task-time">
                          <IconCalendar size={12} />
                          {getRelativeTimeString(t.createdAt)}
                        </span>
                      </div>

                      <div className="custom-task-actions">
                        <button
                          onClick={(e) => handleToggleStar(t.id, e)}
                          className={`custom-task-star-btn ${t.starred ? 'active' : ''}`}
                        >
                          {t.starred ? <IconStarFilled size={18} /> : <IconStar size={18} />}
                        </button>
                        <button
                          onClick={(e) => handleDeleteTask(t.id, e)}
                          className="custom-task-delete-btn"
                        >
                          <IconTrash size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 4. Bottom-Right Floating Action Button (FAB) */}
      <button
        className="tasks-fab"
        onClick={() => setIsNewTaskOpen(true)}
        title="Add Task"
      >
        <IconPlus size={24} />
      </button>

      {/* Modal overlays */}
      {/* 1. Add List Modal */}
      {isNewListOpen && (
        <div
          className="modal-overlay open"
          onClick={(e) => e.target === e.currentTarget && setIsNewListOpen(false)}
        >
          <div className="modal">
            <div className="modal-title">Create New List</div>
            <form onSubmit={handleCreateList}>
              <div className="form-field">
                <label htmlFor="list-name-input">List Name</label>
                <input
                  id="list-name-input"
                  type="text"
                  placeholder="e.g. Shopping, Errands"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setIsNewListOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-save">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Add Task Modal */}
      {isNewTaskOpen && (
        <div
          className="modal-overlay open"
          onClick={(e) => e.target === e.currentTarget && setIsNewTaskOpen(false)}
        >
          <div className="modal">
            <div className="modal-title">
              Add Task to {activeListName}
            </div>
            <form onSubmit={handleCreateTask}>
              <div className="form-field">
                <label htmlFor="task-name-input">Task Details</label>
                <input
                  id="task-name-input"
                  type="text"
                  placeholder="e.g. buy groceries, reply to email"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setIsNewTaskOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-save">
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

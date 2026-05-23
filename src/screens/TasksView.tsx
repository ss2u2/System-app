import React, { useState, useEffect } from 'react';
import {
  IconStarFilled,
  IconPlus,
} from '@tabler/icons-react';
import { store } from '../services/db';
import type { AppState, Task } from '../types';
import AddTaskModal from '../components/AddTaskModal';
import TasksContainer from '../components/TasksContainer';
import { parseTask } from '../utils/taskHelper';

interface TasksViewProps {
  state: AppState;
  onEditTask: (id: number) => void;
  onToggleTask: (id: number) => void;
  onDeleteTask: (id: number) => void;
}

export default function TasksView({
  state,
  onEditTask,
  onToggleTask,
  onDeleteTask,
}: TasksViewProps) {
  const [activeListId, setActiveListId] = useState<string | number>(1001); // default to 'My Tasks' list
  // Modals state
  const [isNewListOpen, setIsNewListOpen] = useState(false);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newListName, setNewListName] = useState('');

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
    .map(t => parseTask(t));

  // Calculate active task count per list
  const getActiveCount = (listId: number) => {
    return customTasks.filter(t => t.listId === listId && !t.done).length;
  };





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
    }
  };

  const handleCreateTask = (taskData: {
    name: string;
    date: string;
    time: string;
    repeatType: 'none' | 'daily' | 'custom';
    repeatValue: string;
  }) => {
    // If currently on "Starred" section, add task to the default "My Tasks" list (1001) as starred
    const listId = activeListId === 'starred' ? 1001 : Number(activeListId);
    const isStarred = activeListId === 'starred';

    const newTaskId = Date.now();
    const newTask: Task = {
      id: newTaskId,
      name: taskData.name,
      cat: `list-item|${listId}|${isStarred}|${Date.now()}|${taskData.date}|${taskData.time}|${taskData.repeatType}|${taskData.repeatValue}`,
      done: false
    };

    store.setState({ tasks: [...state.tasks, newTask] });
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
    onDeleteTask(taskId);
  };




  // Get active list name
  const activeListName = (() => {
    if (activeListId === 'starred') return 'Starred Tasks';
    const list = allLists.find(l => l.id === Number(activeListId));
    return list ? list.name : 'Tasks';
  })();



  return (
    <div className="tasks-view-container" style={{ paddingTop: '16px' }}>
      {/* 1. Header with Title & Avatar has been removed since TopBar handles it now */}

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
          const isActive = String(activeListId) === String(list.id);
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

      <TasksContainer
        state={state}
        activeListId={activeListId}
        activeListName={activeListName}
        handleToggleTask={onToggleTask}
        handleToggleStar={handleToggleStar}
        handleDeleteTask={handleDeleteTask}
        handleDeleteList={handleDeleteList}
        onEditTask={onEditTask}
      />

      {/* Bottom-Right Floating Action Button (FAB) */}
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
      <AddTaskModal
        isOpen={isNewTaskOpen}
        onClose={() => setIsNewTaskOpen(false)}
        title={`Add Task to ${activeListName}`}
        onSave={handleCreateTask}
      />
    </div>
  );
}

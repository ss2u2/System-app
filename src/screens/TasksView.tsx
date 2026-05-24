import React, { useState } from 'react';
import {
  IconStarFilled,
  IconPlus,
} from '@tabler/icons-react';
import { store } from '../services/db';
import type { AppState, Task } from '../types';
import AddTaskModal from '../components/AddTaskModal';
import TasksContainer from '../components/TasksContainer';
import FloatingActionButton from '../components/FloatingActionButton';
import { parseTask, generateSecureNumericId } from '../utils/taskHelper';

interface TasksViewProps {
  state: AppState;
  onEditTask: (id: number | string) => void;
  onToggleTask: (id: number | string) => void;
  onDeleteTask: (id: number | string) => void;
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

  // Relational lists and tasks
  const allLists = state.lists && state.lists.length > 0 ? state.lists : [{ id: 1001, name: 'My Tasks' }];

  const customTasks = (state.tasks || [])
    .filter(t => t.listId !== undefined && t.listId !== null)
    .map(t => parseTask(t));

  // Calculate active task count per list
  const getActiveCount = (listId: number | string) => {
    return customTasks.filter(t => t.listId === listId && !t.done).length;
  };

  // Handlers
  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    const newListId = generateSecureNumericId();
    const newList = {
      id: newListId,
      name: newListName.trim()
    };
    store.setState({ lists: [...(state.lists || []), newList] });
    setNewListName('');
    setIsNewListOpen(false);
    setActiveListId(newListId);
  };

  const handleDeleteList = (listId: number | string) => {
    if (window.confirm('Are you sure you want to delete this list and all its tasks?')) {
      const updatedLists = (state.lists || []).filter(l => l.id !== listId);
      const updatedTasks = (state.tasks || []).filter(t => t.listId !== listId);
      
      const deletedIds = {
        ...(state.deletedIds || {}),
        lists: [...(state.deletedIds?.lists || []), listId]
      };
      
      store.setState({ lists: updatedLists, tasks: updatedTasks, deletedIds });
      setActiveListId(1001); // fallback to My Tasks
    }
  };

  const handleCreateTask = (taskData: {
    name: string;
    date: string;
    time: string;
    repeatType: 'none' | 'daily' | 'custom';
    repeatValue: string;
  }) => {
    const listId = activeListId === 'starred' ? 1001 : (isNaN(Number(activeListId)) ? activeListId : Number(activeListId));
    const isStarred = activeListId === 'starred';

    const newTaskId = generateSecureNumericId();
    const newTask: Task = {
      id: newTaskId,
      name: taskData.name,
      done: false,
      listId,
      starred: isStarred,
      createdAt: Date.now(),
      date: taskData.date || undefined,
      time: taskData.time || undefined,
      repeatType: taskData.repeatType || 'none',
      repeatValue: taskData.repeatValue || '',
      cat: '',
      subtasks: []
    };

    store.setState({ tasks: [...state.tasks, newTask] });
  };

  const handleToggleStar = (taskId: number | string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = state.tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, starred: !t.starred };
      }
      return t;
    });
    store.setState({ tasks: updated });
  };

  const handleDeleteTask = (taskId: number | string, e: React.MouseEvent) => {
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
      {/* 1. Horizontally Scrollable List Tabs */}
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
      <FloatingActionButton
        onClick={() => setIsNewTaskOpen(true)}
        icon={IconPlus}
        title="Add Task"
      />

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

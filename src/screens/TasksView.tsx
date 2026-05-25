import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
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
import ConfirmationModal from '../components/ui/ConfirmationModal';
// Import UI Design System components
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import FormField from '../components/ui/FormField';

export default function TasksView() {
  const navigate = useNavigate();

  // Retrieve shared state and handlers from Outlet Context
  const {
    state,
    handleGlobalToggleTask,
    handleGlobalDeleteTask,
  } = useOutletContext<{
    state: AppState;
    handleGlobalToggleTask: (id: number | string) => void;
    handleGlobalDeleteTask: (id: number | string) => void;
  }>();

  const [activeListId, setActiveListId] = useState<string | number>(1001); // default to 'My Tasks' list
  const [slideDirection, setSlideDirection] = useState<'right-to-left' | 'left-to-right' | ''>('');

  const tabsRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tabsRowRef.current) {
      const activeButton = tabsRowRef.current.querySelector('.tasks-tab-item.active');
      if (activeButton) {
        activeButton.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [activeListId]);

  const handleSwitchList = (newId: string | number) => {
    const getListIndex = (id: string | number) => {
      if (id === 'starred') return 0;
      const idx = allLists.findIndex(l => String(l.id) === String(id));
      return idx !== -1 ? idx + 1 : 0;
    };
    
    const prevIdx = getListIndex(activeListId);
    const currIdx = getListIndex(newId);
    
    if (currIdx > prevIdx) {
      setSlideDirection('right-to-left');
    } else if (currIdx < prevIdx) {
      setSlideDirection('left-to-right');
    }
    
    setActiveListId(newId);
  };
  // Modals state
  const [isNewListOpen, setIsNewListOpen] = useState(false);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [listToDelete, setListToDelete] = useState<number | string | null>(null);
  const [listToRename, setListToRename] = useState<number | string | null>(null);
  const [renameListName, setRenameListName] = useState('');

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
    setListToDelete(listId);
  };

  const handleOpenRenameModal = (listId: number | string) => {
    const list = allLists.find(l => String(l.id) === String(listId));
    if (list) {
      setListToRename(listId);
      setRenameListName(list.name);
    }
  };

  const handleRenameListSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (listToRename === null || !renameListName.trim()) return;
    
    const updatedLists = (state.lists || []).map(l => {
      if (String(l.id) === String(listToRename)) {
        return { ...l, name: renameListName.trim() };
      }
      return l;
    });
    
    store.setState({ lists: updatedLists });
    setListToRename(null);
    setRenameListName('');
  };

  const confirmDeleteList = () => {
    if (!listToDelete) return;
    const listId = listToDelete;
    const updatedLists = (state.lists || []).filter(l => String(l.id) !== String(listId));
    const updatedTasks = (state.tasks || []).filter(t => String(t.listId) !== String(listId));
    
    const deletedIds = {
      ...(state.deletedIds || {}),
      lists: [...(state.deletedIds?.lists || []), listId]
    };
    
    store.setState({ lists: updatedLists, tasks: updatedTasks, deletedIds });
    setActiveListId(1001); // fallback to My Tasks
    setListToDelete(null);
  };

  const handleCreateTask = (taskData: {
    name: string;
    details: string;
    listId: number | string;
    starred: boolean;
    date: string;
    time: string;
    repeatType: 'none' | 'daily' | 'custom';
    repeatValue: string;
    deadline: string;
  }) => {
    const newTaskId = generateSecureNumericId();
    const newTask: Task = {
      id: newTaskId,
      name: taskData.name,
      details: taskData.details,
      done: false,
      listId: taskData.listId,
      starred: taskData.starred,
      createdAt: Date.now(),
      date: taskData.date || undefined,
      time: taskData.time || undefined,
      repeatType: taskData.repeatType || 'none',
      repeatValue: taskData.repeatValue || '',
      deadline: taskData.deadline || undefined,
      cat: '',
      subtasks: []
    };

    store.setState({ tasks: [...(state.tasks || []), newTask] });
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
    handleGlobalDeleteTask(taskId);
  };

  const handleEditTask = (taskId: number | string) => {
    navigate(`/tasks/detail/${taskId}`);
  };

  // Get active list name
  const activeListName = (() => {
    if (activeListId === 'starred') return 'Starred Tasks';
    const list = allLists.find(l => l.id === Number(activeListId));
    return list ? list.name : 'Tasks';
  })();

  return (
    <div className="tasks-view-container">
      {/* 1. Horizontally Scrollable List Tabs */}
      <div className="tasks-tabs-row" ref={tabsRowRef}>
        {/* Starred Tab */}
        <button
          className={`tasks-tab-item star-tab ${activeListId === 'starred' ? 'active' : ''}`}
          onClick={() => handleSwitchList('starred')}
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
              onClick={() => handleSwitchList(list.id)}
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
        handleToggleTask={handleGlobalToggleTask}
        handleToggleStar={handleToggleStar}
        handleDeleteTask={handleDeleteTask}
        handleDeleteList={handleDeleteList}
        onRenameList={handleOpenRenameModal}
        onEditTask={handleEditTask}
        onSwitchList={handleSwitchList}
        slideDirection={slideDirection}
      />

      {/* Bottom-Right Floating Action Button (FAB) */}
      <FloatingActionButton
        onClick={() => setIsNewTaskOpen(true)}
        icon={IconPlus}
        title="Add Task"
      />

      {/* Modal overlays */}
      {/* 1. Add List Modal */}
      <Modal
        isOpen={isNewListOpen}
        onClose={() => setIsNewListOpen(false)}
        title="Create New List"
      >
        <form onSubmit={handleCreateList}>
          <FormField label="List Name" htmlFor="list-name-input">
            <input
              id="list-name-input"
              type="text"
              placeholder="e.g. Shopping, Errands"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              className="ui-input"
              autoFocus
              required
            />
          </FormField>
          <div className="modal-actions" style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <Button type="button" onClick={() => setIsNewListOpen(false)} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" style={{ flex: 1 }}>
              Create
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Add Task Modal */}
      <AddTaskModal
        isOpen={isNewTaskOpen}
        onClose={() => setIsNewTaskOpen(false)}
        initialListId={activeListId}
        initialStarred={activeListId === 'starred'}
        onSave={handleCreateTask}
      />

      <ConfirmationModal
        isOpen={listToDelete !== null}
        onClose={() => setListToDelete(null)}
        onConfirm={confirmDeleteList}
        title="Are you sure you want to delete this list and all its tasks?"
        confirmLabel="Delete"
      />

      {/* 3. Rename List Modal */}
      <Modal
        isOpen={listToRename !== null}
        onClose={() => setListToRename(null)}
        title="Rename List"
      >
        <form onSubmit={handleRenameListSubmit}>
          <FormField label="List Name" htmlFor="rename-list-name-input">
            <input
              id="rename-list-name-input"
              type="text"
              placeholder="e.g. Shopping, Errands"
              value={renameListName}
              onChange={(e) => setRenameListName(e.target.value)}
              className="ui-input"
              autoFocus
              required
            />
          </FormField>
          <div className="modal-actions" style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <Button type="button" onClick={() => setListToRename(null)} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" style={{ flex: 1 }}>
              Save
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

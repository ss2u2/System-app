import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  IconStarFilled,
  IconPlus,
  IconGripVertical,
  IconArrowRight,
  IconDotsVertical,
  IconTrash,
  IconPencil
} from '@tabler/icons-react';
import { usePointerDragReorder } from '../hooks/usePointerDragReorder';
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
import Dropdown, { DropdownItem } from '../components/ui/Dropdown';

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

  // Relational lists and tasks
  const allLists = state.lists && state.lists.length > 0 ? state.lists : [{ id: 1001, name: 'My Tasks' }];

  const customTasks = (state.tasks || [])
    .filter(t => t.listId !== undefined && t.listId !== null)
    .map(t => parseTask(t));

  // Calculate active task count per list
  const getActiveCount = (listId: number | string) => {
    return customTasks.filter(t => t.listId === listId && !t.done).length;
  };

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

  useEffect(() => {
    const handleOpenLists = () => {
      setIsListsModalOpen(true);
    };
    window.addEventListener('open-manage-lists', handleOpenLists);
    return () => {
      window.removeEventListener('open-manage-lists', handleOpenLists);
    };
  }, []);

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

  // Bottom Sliding Sheet State
  const [isListsModalOpen, setIsListsModalOpen] = useState(false);
  const [translateY, setTranslateY] = useState(0);
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);
  const sheetStartY = useRef(0);
  const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressActive = useRef(false);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  // List Reordering Handlers
  const handleReorderLists = (dragId: string | number, targetId: string | number) => {
    const updatedLists = [...allLists];
    const dragIdx = updatedLists.findIndex(l => String(l.id) === String(dragId));
    const targetIdx = updatedLists.findIndex(l => String(l.id) === String(targetId));
    if (dragIdx !== -1 && targetIdx !== -1) {
      const [dragged] = updatedLists.splice(dragIdx, 1);
      updatedLists.splice(targetIdx, 0, dragged);
      
      const reordered = updatedLists.map((l, index) => ({
        ...l,
        orderIndex: index
      }));
      
      store.setState({ lists: reordered });
    }
  };

  const {
    draggedId: draggedListId,
    getItemStyle: getListItemStyle,
    getItemProps: getListItemProps,
  } = usePointerDragReorder({
    items: allLists,
    onReorder: handleReorderLists,
    enabled: true,
    disableRowCursor: true,
  });

  // Slide down gesture to close
  useEffect(() => {
    if (!isDraggingSheet) return;

    const handleGlobalMove = (e: TouchEvent | PointerEvent) => {
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const deltaY = clientY - sheetStartY.current;
      if (deltaY > 0) {
        setTranslateY(deltaY);
      }
    };

    const handleGlobalEnd = () => {
      setIsDraggingSheet(false);
      if (translateY > 120) {
        setIsListsModalOpen(false);
      }
      setTranslateY(0);
    };

    window.addEventListener('pointermove', handleGlobalMove);
    window.addEventListener('pointerup', handleGlobalEnd);
    window.addEventListener('touchmove', handleGlobalMove, { passive: false });
    window.addEventListener('touchend', handleGlobalEnd);

    return () => {
      window.removeEventListener('pointermove', handleGlobalMove);
      window.removeEventListener('pointerup', handleGlobalEnd);
      window.removeEventListener('touchmove', handleGlobalMove);
      window.removeEventListener('touchend', handleGlobalEnd);
    };
  }, [isDraggingSheet, translateY]);

  const handleSheetTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    sheetStartY.current = clientY;
    setIsDraggingSheet(true);
  };

  // Long press tab to open bottom sheet
  const startLongPress = (e: React.MouseEvent | React.TouchEvent) => {
    // Only trigger on mobile (screen width < 768)
    if (window.innerWidth >= 768) return;

    isLongPressActive.current = false;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    touchStartPos.current = { x: clientX, y: clientY };

    longPressTimeoutRef.current = setTimeout(() => {
      isLongPressActive.current = true;
      setIsListsModalOpen(true);
    }, 500);
  };

  const cancelLongPress = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const handleTabClick = (listId: number | string) => {
    if (isLongPressActive.current) {
      isLongPressActive.current = false;
      return;
    }
    handleSwitchList(listId);
  };

  const handleTouchMoveTab = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartPos.current.x;
    const dy = touch.clientY - touchStartPos.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 10) {
      cancelLongPress();
    }
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
    const listTasks = (state.tasks || []).filter(t => String(t.listId) === String(taskData.listId));
    const maxOrderIndex = listTasks.reduce((max, t) => {
      const val = t.orderIndex !== undefined && t.orderIndex !== null ? t.orderIndex : 0;
      return val > max ? val : max;
    }, 0);

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
      subtasks: [],
      orderIndex: maxOrderIndex + 1
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
          onMouseDown={startLongPress}
          onMouseUp={cancelLongPress}
          onMouseLeave={cancelLongPress}
          onTouchStart={startLongPress}
          onTouchEnd={cancelLongPress}
          onTouchMove={handleTouchMoveTab}
          onClick={() => handleTabClick('starred')}
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
              onMouseDown={startLongPress}
              onMouseUp={cancelLongPress}
              onMouseLeave={cancelLongPress}
              onTouchStart={startLongPress}
              onTouchEnd={cancelLongPress}
              onTouchMove={handleTouchMoveTab}
              onClick={() => handleTabClick(list.id)}
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

      {/* List Reordering Bottom Sheet Modal */}
      <div
        className={`bottom-sheet-overlay ${isListsModalOpen ? 'open' : ''}`}
        onClick={() => setIsListsModalOpen(false)}
      >
        <div
          className="bottom-sheet-content"
          style={{ transform: translateY > 0 ? `translateY(${translateY}px)` : undefined }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag Handle Area */}
          <div
            className="bottom-sheet-drag-handle-wrapper"
            onMouseDown={handleSheetTouchStart}
            onTouchStart={handleSheetTouchStart}
          >
            <div className="bottom-sheet-drag-handle" />
          </div>
          
          <h3 className="bottom-sheet-title">Manage Lists</h3>
          
          <div className="bottom-sheet-body">
            {/* 0. Static Starred List (Not Draggable) */}
            <div className="bottom-sheet-list-item">
              <div className="bottom-sheet-list-item-left">
                <div className="bottom-sheet-drag-btn" style={{ cursor: 'default', color: 'var(--amber)', opacity: 1, width: '28px', marginLeft: '6px', marginRight: '6px' }}>
                  <IconStarFilled size={18} />
                </div>
                <span className="bottom-sheet-list-name">Starred</span>
              </div>
              
              <div className="bottom-sheet-list-item-right">
                <button
                  className="bottom-sheet-arrow-btn"
                  onClick={() => {
                    setIsListsModalOpen(false);
                    handleSwitchList('starred');
                  }}
                >
                  <IconArrowRight size={18} />
                </button>
              </div>
            </div>

            {allLists.map((list, index) => {
              const style = getListItemStyle(list.id, index);
              const props = getListItemProps(list.id, index);
              const isDragging = draggedListId === list.id;
              
              return (
                <div
                  key={list.id}
                  className={`bottom-sheet-list-item ${isDragging ? 'dragging-active' : ''}`}
                  style={style}
                  {...props}
                >
                  <div className="bottom-sheet-list-item-left">
                    <div className="bottom-sheet-drag-btn j-drag-handle">
                      <IconGripVertical size={22} stroke={2.5} />
                    </div>
                    <span className="bottom-sheet-list-name">{list.name}</span>
                  </div>
                  
                  <div className="bottom-sheet-list-item-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Dropdown
                      align="right"
                      trigger={
                        <button className="bottom-sheet-options-btn" style={{ background: 'none', border: 'none', color: 'var(--text3)', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <IconDotsVertical size={18} />
                        </button>
                      }
                    >
                      <DropdownItem onClick={() => handleOpenRenameModal(list.id)}>
                        <IconPencil size={14} />
                        <span>Rename List</span>
                      </DropdownItem>
                      {list.id !== 1001 && (
                        <DropdownItem variant="danger" onClick={() => handleDeleteList(list.id)}>
                          <IconTrash size={14} />
                          <span>Delete List</span>
                        </DropdownItem>
                      )}
                    </Dropdown>

                    <button
                      className="bottom-sheet-arrow-btn"
                      onClick={() => {
                        setIsListsModalOpen(false);
                        handleSwitchList(list.id);
                      }}
                    >
                      <IconArrowRight size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer with Done button */}
          <div className="bottom-sheet-footer">
            <button className="bottom-sheet-done-btn" onClick={() => setIsListsModalOpen(false)}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import {
  IconArrowsSort,
  IconDotsVertical,
  IconTrash,
  IconChevronDown,
  IconChevronUp,
  IconCheck,
} from '@tabler/icons-react';
import type { AppState, Task } from '../types';
import TaskItem from './TaskItem';
import { parseTask, getLocalDateString, formatTaskDate } from '../utils/taskHelper';
import { store } from '../services/db';
import { usePointerDragReorder } from '../hooks/usePointerDragReorder';

interface TasksContainerProps {
  state: AppState;
  activeListId: string | number;
  activeListName: string;
  handleToggleTask: (taskId: number | string) => void;
  handleToggleStar: (taskId: number | string, e: React.MouseEvent) => void;
  handleDeleteTask: (taskId: number | string, e: React.MouseEvent) => void;
  handleDeleteList: (listId: number | string) => void;
  onEditTask: (id: number | string) => void;
}

export default function TasksContainer({
  state,
  activeListId,
  activeListName,
  handleToggleTask,
  handleToggleStar,
  handleDeleteTask,
  handleDeleteList,
  onEditTask,
}: TasksContainerProps) {
  // Load initial sort order from localStorage, defaulting to 'myorder'
  const [sortOrder, setSortOrder] = useState<'myorder' | 'date' | 'deadline' | 'title' | 'created'>(() => {
    const saved = localStorage.getItem('tasks_sort_order');
    return (saved as any) || 'myorder';
  });

  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isCompletedOpen, setIsCompletedOpen] = useState(false);
  const [menuOpenListId, setMenuOpenListId] = useState<string | number | null>(null);
  
  // Menu and dropdown refs
  const menuRef = useRef<HTMLDivElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  // Save sortOrder to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('tasks_sort_order', sortOrder);
  }, [sortOrder]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenListId(null);
      }
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setIsSortMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Helper functions for drag and drop order
  const getTasksOrder = (listId: string | number): (number | string)[] => {
    try {
      const stored = localStorage.getItem(`tasks_order_${listId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const saveTasksOrder = (listId: string | number, order: (number | string)[]) => {
    try {
      localStorage.setItem(`tasks_order_${listId}`, JSON.stringify(order));
    } catch (e) {
      console.error(e);
    }
  };

  // Parse all tasks to CustomTask format
  const customTasks = (state.tasks || [])
    .filter(t => t.listId !== undefined && t.listId !== null)
    .map(t => parseTask(t));

  // Filter tasks based on active list selection
  const filteredTasks = (() => {
    if (activeListId === 'starred') {
      return customTasks.filter(t => t.starred);
    }
    return customTasks.filter(t => String(t.listId) === String(activeListId));
  })();

  // Sorting logics
  const sortTasksFlat = (tasksList: typeof customTasks) => {
    if (sortOrder === 'title') {
      return [...tasksList].sort((a, b) => a.name.localeCompare(b.name));
    }
    
    if (sortOrder === 'deadline') {
      return [...tasksList].sort((a, b) => {
        if (!a.date) return 1; // No date tasks go to bottom
        if (!b.date) return -1;
        return a.date.localeCompare(b.date);
      });
    }

    if (sortOrder === 'created') {
      return [...tasksList].sort((a, b) => a.createdAt - b.createdAt);
    }

    if (sortOrder === 'myorder') {
      const order = getTasksOrder(activeListId);
      const missingIds = tasksList.filter(t => !order.includes(t.id)).map(t => t.id);
      
      let finalOrder = order;
      if (missingIds.length > 0) {
        finalOrder = [...order, ...missingIds];
        saveTasksOrder(activeListId, finalOrder);
      }

      const taskMap = new Map(tasksList.map(t => [t.id, t]));
      return finalOrder
        .map(id => taskMap.get(id))
        .filter((t): t is typeof customTasks[0] => !!t);
    }

    // fallback / default
    return tasksList;
  };

  const activeTasks = sortTasksFlat(filteredTasks.filter(t => !t.done));
  const completedTasks = sortTasksFlat(filteredTasks.filter(t => t.done));

  const handleReorder = (dragId: number | string, targetId: number | string) => {
    // 1. Update localStorage order index
    const currentOrder = getTasksOrder(activeListId);
    const missingIds = filteredTasks.filter(t => !currentOrder.includes(t.id)).map(t => t.id);
    let finalOrder = [...currentOrder, ...missingIds];

    const dragIndex = finalOrder.indexOf(dragId);
    const targetIndex = finalOrder.indexOf(targetId);

    if (dragIndex !== -1 && targetIndex !== -1) {
      finalOrder.splice(dragIndex, 1);
      finalOrder.splice(targetIndex, 0, dragId);
      saveTasksOrder(activeListId, finalOrder);
    }

    // 2. Reorder array in store.tasks to sync to server
    const storeTasks = [...state.tasks];
    const storeDragIdx = storeTasks.findIndex(t => String(t.id) === String(dragId));
    const storeTargetIdx = storeTasks.findIndex(t => String(t.id) === String(targetId));
    if (storeDragIdx !== -1 && storeTargetIdx !== -1) {
      const [dragged] = storeTasks.splice(storeDragIdx, 1);
      storeTasks.splice(storeTargetIdx, 0, dragged);
      store.setState({ tasks: storeTasks });
    }
  };

  const {
    draggedId,
    getItemStyle,
    getItemProps,
  } = usePointerDragReorder({
    items: activeTasks,
    onReorder: handleReorder,
    onEdit: onEditTask,
    enabled: sortOrder === 'myorder',
  });

  const renderTaskItem = (t: any, index: number) => (
    <div
      key={t.id}
      style={sortOrder === 'myorder' ? getItemStyle(t.id, index) : {}}
      {...(sortOrder === 'myorder' ? getItemProps(t.id, index) : {})}
      className={`task-item-wrap ${draggedId === t.id ? 'dragging-active' : ''}`}
    >
      <TaskItem
        task={convertToTask(t)}
        onToggle={handleToggleTask}
        onToggleStar={handleToggleStar}
        onDelete={handleDeleteTask}
        onEdit={sortOrder === 'myorder' ? undefined : onEditTask}
        isDragging={draggedId === t.id}
      />
    </div>
  );

  // Group active tasks by date (Only visible when sortOrder is 'date')
  const todayDateStr = getLocalDateString();
  const groupedActiveTasks = (() => {
    const groups: { key: string; title: string; isToday: boolean; tasks: typeof customTasks }[] = [];
    const todayTasks: typeof customTasks = [];
    const otherTasksMap: Record<string, typeof customTasks> = {};
    const noDateTasks: typeof customTasks = [];

    activeTasks.forEach(t => {
      if (!t.date) {
        noDateTasks.push(t);
      } else if (t.date === todayDateStr) {
        todayTasks.push(t);
      } else {
        if (!otherTasksMap[t.date]) {
          otherTasksMap[t.date] = [];
        }
        otherTasksMap[t.date].push(t);
      }
    });

    if (todayTasks.length > 0) {
      groups.push({
        key: 'today',
        title: 'Today',
        isToday: true,
        tasks: todayTasks,
      });
    }

    const sortedDates = Object.keys(otherTasksMap).sort((a, b) => a.localeCompare(b));
    sortedDates.forEach(dateStr => {
      groups.push({
        key: dateStr,
        title: formatTaskDate(dateStr),
        isToday: false,
        tasks: otherTasksMap[dateStr],
      });
    });

    if (noDateTasks.length > 0) {
      groups.push({
        key: 'no-date',
        title: 'No date',
        isToday: false,
        tasks: noDateTasks,
      });
    }

    return groups;
  })();

  // Group active tasks by creation date (Only visible when sortOrder is 'created')
  const groupedCreatedActiveTasks = (() => {
    const groups: { key: string; title: string; isToday: boolean; tasks: typeof customTasks }[] = [];
    const dateGroupsMap: Record<string, typeof customTasks> = {};

    activeTasks.forEach(t => {
      const dateStr = getLocalDateString(new Date(t.createdAt));
      if (!dateGroupsMap[dateStr]) {
        dateGroupsMap[dateStr] = [];
      }
      dateGroupsMap[dateStr].push(t);
    });

    const sortedDates = Object.keys(dateGroupsMap).sort((a, b) => a.localeCompare(b));
    sortedDates.forEach(dateStr => {
      groups.push({
        key: dateStr,
        title: formatTaskDate(dateStr),
        isToday: dateStr === todayDateStr,
        tasks: dateGroupsMap[dateStr].sort((a, b) => a.createdAt - b.createdAt),
      });
    });

    return groups;
  })();

  const convertToTask = (t: typeof customTasks[0]): Task => {
    return {
      ...t,
      cat: ''
    };
  };

  return (
    <>
      {/* 1. Active Tasks Card */}
      <div className="tasks-card">
        {/* Card Header */}
        <div className="tasks-card-header">
          <span className="tasks-card-title">{activeListName}</span>
          <div className="tasks-card-actions">
            
            {/* Sorting Custom Dropdown */}
            <div style={{ position: 'relative' }} ref={sortMenuRef}>
              <button
                onClick={() => setIsSortMenuOpen(prev => !prev)}
                className="tasks-action-btn"
                title="Sort options"
              >
                <IconArrowsSort size={18} />
              </button>
              {isSortMenuOpen && (
                <div className="tasks-dropdown-menu">
                  <button
                    onClick={() => { setSortOrder('myorder'); setIsSortMenuOpen(false); }}
                    className={`dropdown-item ${sortOrder === 'myorder' ? 'active-sort' : ''}`}
                    style={sortOrder === 'myorder' ? { color: 'var(--accent)', fontWeight: 600 } : undefined}
                  >
                    {sortOrder === 'myorder' && <IconCheck size={14} style={{ marginRight: 6 }} />}
                    My Order
                  </button>
                  <button
                    onClick={() => { setSortOrder('date'); setIsSortMenuOpen(false); }}
                    className={`dropdown-item ${sortOrder === 'date' ? 'active-sort' : ''}`}
                    style={sortOrder === 'date' ? { color: 'var(--accent)', fontWeight: 600 } : undefined}
                  >
                    {sortOrder === 'date' && <IconCheck size={14} style={{ marginRight: 6 }} />}
                    Date
                  </button>
                  <button
                    onClick={() => { setSortOrder('deadline'); setIsSortMenuOpen(false); }}
                    className={`dropdown-item ${sortOrder === 'deadline' ? 'active-sort' : ''}`}
                    style={sortOrder === 'deadline' ? { color: 'var(--accent)', fontWeight: 600 } : undefined}
                  >
                    {sortOrder === 'deadline' && <IconCheck size={14} style={{ marginRight: 6 }} />}
                    Deadline
                  </button>
                  <button
                    onClick={() => { setSortOrder('title'); setIsSortMenuOpen(false); }}
                    className={`dropdown-item ${sortOrder === 'title' ? 'active-sort' : ''}`}
                    style={sortOrder === 'title' ? { color: 'var(--accent)', fontWeight: 600 } : undefined}
                  >
                    {sortOrder === 'title' && <IconCheck size={14} style={{ marginRight: 6 }} />}
                    Title
                  </button>
                  <button
                    onClick={() => { setSortOrder('created'); setIsSortMenuOpen(false); }}
                    className={`dropdown-item ${sortOrder === 'created' ? 'active-sort' : ''}`}
                    style={sortOrder === 'created' ? { color: 'var(--accent)', fontWeight: 600 } : undefined}
                  >
                    {sortOrder === 'created' && <IconCheck size={14} style={{ marginRight: 6 }} />}
                    Date Created
                  </button>
                </div>
              )}
            </div>

            {/* List Action Menu */}
            {activeListId !== 'starred' && activeListId !== 1001 && (
              <div style={{ position: 'relative' }} ref={menuRef}>
                <button
                  onClick={() => setMenuOpenListId(prev => prev === activeListId ? null : activeListId)}
                  className="tasks-action-btn"
                >
                  <IconDotsVertical size={18} />
                </button>
                {menuOpenListId === activeListId && (
                  <div className="tasks-dropdown-menu">
                    <button
                      onClick={() => handleDeleteList(activeListId)}
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

        {/* Card Body */}
        <div className="tasks-card-body">
          {activeTasks.length > 0 ? (
            <div className="custom-tasks-list">
              {/* Grouped view if sorting by Date */}
              {sortOrder === 'date' ? (
                groupedActiveTasks.map(group => (
                  <div key={group.key} className="task-date-group">
                    <div className={`task-group-title ${group.isToday ? 'today-title' : ''}`}>
                      {group.title}
                    </div>
                    {group.tasks.map((t, i) => renderTaskItem(t, i))}
                  </div>
                ))
              ) : sortOrder === 'created' ? (
                /* Grouped view if sorting by Creation Date */
                groupedCreatedActiveTasks.map(group => (
                  <div key={group.key} className="task-date-group">
                    <div className={`task-group-title ${group.isToday ? 'today-title' : ''}`}>
                      {group.title}
                    </div>
                    {group.tasks.map((t, i) => renderTaskItem(t, i))}
                  </div>
                ))
              ) : (
                /* Flat view for other sort orders */
                activeTasks.map((t, i) => renderTaskItem(t, i))
              )}
            </div>
          ) : (
            <div className="tasks-empty-state">
              <span>No active tasks in this list</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Completed Section */}
      {completedTasks.length > 0 && (
        <div className="completed-tasks-card" style={{ marginBottom: '80px' }}>
          <button
            className="completed-header"
            onClick={() => setIsCompletedOpen(prev => !prev)}
            style={{ width: '100%', outline: 'none' }}
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
                <TaskItem
                  key={t.id}
                  task={convertToTask(t)}
                  onToggle={handleToggleTask}
                  onToggleStar={handleToggleStar}
                  onDelete={handleDeleteTask}
                  onEdit={onEditTask}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

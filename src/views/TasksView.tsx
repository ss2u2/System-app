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
  IconRepeat,
} from '@tabler/icons-react';
import { store } from '../services/db';
import type { AppState, Task } from '../types';

// Helper functions for date and time formatting
const getLocalDateString = (d: Date = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTaskDate = (dateStr: string) => {
  if (!dateStr) return '';
  const today = getLocalDateString();
  if (dateStr === today) return 'Today';
  
  const [year, month, day] = dateStr.split('-');
  const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
  return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatTaskTime = (timeStr: string) => {
  if (!timeStr) return '';
  const [hoursStr, minutesStr] = timeStr.split(':');
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = String(minutes).padStart(2, '0');
  return `${displayHours}:${displayMinutes} ${ampm}`;
};

// Helper to calculate the next date for a repeating task
const getNextOccurrenceDate = (
  baseDateStr: string,
  repeatType: string,
  repeatValue: string
): string | null => {
  let baseDate = baseDateStr ? new Date(baseDateStr + 'T00:00:00') : new Date();
  if (isNaN(baseDate.getTime())) {
    baseDate = new Date();
  }

  if (repeatType === 'daily') {
    const nextDate = new Date(baseDate);
    nextDate.setDate(nextDate.getDate() + 1);
    return getLocalDateString(nextDate);
  }

  if (repeatType === 'custom') {
    try {
      const config = JSON.parse(repeatValue);
      const every = Number(config.every) || 1;
      const unit = config.unit || 'day';
      const ends = config.ends || 'never';
      
      if (ends === 'after' && Number(config.endsAfter) <= 1) {
        return null; // No more occurrences!
      }

      const nextDate = new Date(baseDate);
      
      if (unit === 'day') {
        nextDate.setDate(nextDate.getDate() + every);
      } else if (unit === 'week') {
        const days: number[] = config.days || [];
        if (days.length === 0) {
          nextDate.setDate(nextDate.getDate() + every * 7);
        } else {
          const sortedDays = [...days].sort((a, b) => a - b);
          const currentDayOfWeek = baseDate.getDay();
          
          let targetDayOfWeek = -1;
          for (const d of sortedDays) {
            if (d > currentDayOfWeek) {
              targetDayOfWeek = d;
              break;
            }
          }
          
          if (targetDayOfWeek !== -1) {
            const diff = targetDayOfWeek - currentDayOfWeek;
            nextDate.setDate(nextDate.getDate() + diff);
          } else {
            targetDayOfWeek = sortedDays[0];
            const diff = (7 - currentDayOfWeek) + targetDayOfWeek;
            nextDate.setDate(nextDate.getDate() + diff + (every - 1) * 7);
          }
        }
      } else if (unit === 'month') {
        nextDate.setMonth(nextDate.getMonth() + every);
      } else if (unit === 'year') {
        nextDate.setFullYear(nextDate.getFullYear() + every);
      }
      
      const nextDateStr = getLocalDateString(nextDate);
      
      if (ends === 'on' && config.endsOn) {
        if (nextDateStr > config.endsOn) {
          return null; // Past end date
        }
      }
      
      return nextDateStr;
    } catch (e) {
      console.error(e);
      const nextDate = new Date(baseDate);
      nextDate.setDate(nextDate.getDate() + 1);
      return getLocalDateString(nextDate);
    }
  }
  
  return null;
};

interface TasksViewProps {
  state: AppState;
}

export default function TasksView({ state }: TasksViewProps) {
  const [activeListId, setActiveListId] = useState<string | number>(1001); // default to 'My Tasks' list
  const [isCompletedOpen, setIsCompletedOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'alpha'>('oldest');
  
  // Modals state
  const [isNewListOpen, setIsNewListOpen] = useState(false);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newTaskName, setNewTaskName] = useState('');
  const [taskDate, setTaskDate] = useState('');
  const [taskTime, setTaskTime] = useState('');
  const [menuOpenListId, setMenuOpenListId] = useState<string | number | null>(null);

  // Repeat settings state
  const [repeatType, setRepeatType] = useState<'none' | 'daily' | 'custom'>('none');
  const [isCustomRepeatOpen, setIsCustomRepeatOpen] = useState(false);
  
  // Custom Repeat Config
  const [customEvery, setCustomEvery] = useState(1);
  const [customUnit, setCustomUnit] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [customDays, setCustomDays] = useState<number[]>([]); // 0: Sunday, 6: Saturday
  const [customEnds, setCustomEnds] = useState<'never' | 'on' | 'after'>('never');
  const [customEndsOn, setCustomEndsOn] = useState('');
  const [customEndsAfter, setCustomEndsAfter] = useState(13);

  // Temporary custom recurrence states
  const [tempEvery, setTempEvery] = useState(1);
  const [tempUnit, setTempUnit] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [tempDays, setTempDays] = useState<number[]>([]);
  const [tempEnds, setTempEnds] = useState<'never' | 'on' | 'after'>('never');
  const [tempEndsOn, setTempEndsOn] = useState('');
  const [tempEndsAfter, setTempEndsAfter] = useState(13);

  const openCustomRepeatModal = () => {
    setTempEvery(customEvery);
    setTempUnit(customUnit);
    setTempDays([...customDays]);
    setTempEnds(customEnds);
    setTempEndsOn(customEndsOn);
    setTempEndsAfter(customEndsAfter);
    setIsCustomRepeatOpen(true);
  };

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
      const parts = t.cat.split('|'); // list-item | listId | starred | createdAt | date | time | repeatType | repeatValue
      return {
        id: t.id,
        listId: Number(parts[1]),
        starred: parts[2] === 'true',
        createdAt: Number(parts[3] || t.id),
        date: parts[4] || undefined,
        time: parts[5] || undefined,
        repeatType: parts[6] || 'none',
        repeatValue: parts[7] || '',
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

    let repeatValueStr = '';
    if (repeatType === 'custom') {
      repeatValueStr = JSON.stringify({
        every: customEvery,
        unit: customUnit,
        days: customDays,
        ends: customEnds,
        endsOn: customEndsOn,
        endsAfter: customEndsAfter
      });
    }

    const newTaskId = Date.now();
    const newTask: Task = {
      id: newTaskId,
      name: newTaskName.trim(),
      cat: `list-item|${listId}|${isStarred}|${Date.now()}|${taskDate}|${taskTime}|${repeatType}|${repeatValueStr}`,
      done: false
    };

    store.setState({ tasks: [...state.tasks, newTask] });
    setNewTaskName('');
    setTaskDate('');
    setTaskTime('');
    setRepeatType('none');
    setCustomEvery(1);
    setCustomUnit('week');
    setCustomDays([]);
    setCustomEnds('never');
    setCustomEndsOn('');
    setCustomEndsAfter(13);
    setIsNewTaskOpen(false);
  };

  const handleToggleTask = (taskId: number) => {
    let newTaskToSpawn: Task | null = null;
    
    const updated = state.tasks.map(t => {
      if (t.id === taskId) {
        const isCompleting = !t.done;
        
        if (isCompleting && t.cat.startsWith('list-item|')) {
          const parts = t.cat.split('|');
          const repeatTypeVal = parts[6] || 'none';
          const repeatValueVal = parts[7] || '';
          
          if (repeatTypeVal !== 'none') {
            const currentDateStr = parts[4] || getLocalDateString();
            const nextDateStr = getNextOccurrenceDate(currentDateStr, repeatTypeVal, repeatValueVal);
            
            if (nextDateStr) {
              const newTaskId = Date.now() + 1;
              let nextRepeatValue = repeatValueVal;
              
              if (repeatTypeVal === 'custom') {
                try {
                  const config = JSON.parse(repeatValueVal);
                  if (config.ends === 'after') {
                    config.endsAfter = Number(config.endsAfter) - 1;
                    nextRepeatValue = JSON.stringify(config);
                  }
                } catch (e) {
                  console.error(e);
                }
              }
              
              const nextCat = `list-item|${parts[1]}|${parts[2]}|${newTaskId}|${nextDateStr}|${parts[5] || ''}|${repeatTypeVal}|${nextRepeatValue}`;
              
              newTaskToSpawn = {
                id: newTaskId,
                name: t.name,
                cat: nextCat,
                done: false
              };
            }
            
            parts[6] = 'none';
            return {
              ...t,
              cat: parts.join('|'),
              done: true
            };
          }
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

  const todayDateStr = getLocalDateString();

  // Group active tasks by date
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
        tasks: noDateTasks
      });
    }

    return groups;
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

      {/* 3. Main Tasks Card */}
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

        {/* Card Body - Grouped Active Tasks */}
        <div className="tasks-card-body">
          {activeTasks.length > 0 ? (
            <div className="custom-tasks-list">
              {groupedActiveTasks.map(group => (
                <div key={group.key} className="task-date-group">
                  <div className={`task-group-title ${group.isToday ? 'today-title' : ''}`}>
                    {group.title}
                  </div>
                  {group.tasks.map(t => (
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
                          {t.time ? (
                            <>
                              <IconCalendar size={12} />
                              <span>{formatTaskTime(t.time)}</span>
                            </>
                          ) : !t.date ? (
                            <span>{getRelativeTimeString(t.createdAt)}</span>
                          ) : null}
                          {t.repeatType && t.repeatType !== 'none' && (
                            <span className="repeat-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', marginLeft: (t.time || !t.date) ? '8px' : '0' }}>
                              <IconRepeat size={12} />
                              <span>
                                {t.repeatType === 'daily' ? 'Daily' : (() => {
                                  try {
                                    const config = JSON.parse(t.repeatValue || '{}');
                                    return `Every ${config.every} ${config.unit}${config.every > 1 ? 's' : ''}`;
                                  } catch (e) {
                                    return 'Custom';
                                  }
                                })()}
                              </span>
                            </span>
                          )}
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
              ))}
            </div>
          ) : (
            <div className="tasks-empty-state">
              <span>No active tasks in this list</span>
            </div>
          )}
        </div>
      </div>

      {/* Completed Section (Separate Container) */}
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
                      {t.time ? (
                        <>
                          <IconCalendar size={12} />
                          <span>{formatTaskTime(t.time)}</span>
                        </>
                      ) : !t.date ? (
                        <span>{getRelativeTimeString(t.createdAt)}</span>
                      ) : null}
                      {t.repeatType && t.repeatType !== 'none' && (
                        <span className="repeat-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', marginLeft: (t.time || !t.date) ? '8px' : '0' }}>
                          <IconRepeat size={12} />
                          <span>
                            {t.repeatType === 'daily' ? 'Daily' : (() => {
                              try {
                                const config = JSON.parse(t.repeatValue || '{}');
                                return `Every ${config.every} ${config.unit}${config.every > 1 ? 's' : ''}`;
                              } catch (e) {
                                return 'Custom';
                              }
                            })()}
                          </span>
                        </span>
                      )}
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

      {/* Bottom-Right Floating Action Button (FAB) */}
      <button
        className="tasks-fab"
        onClick={() => {
          setTaskDate('');
          setTaskTime('');
          setRepeatType('none');
          setIsNewTaskOpen(true);
        }}
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

              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <div className="form-field" style={{ flex: 1 }}>
                  <label htmlFor="task-date-input">Due Date (Optional)</label>
                  <input
                    id="task-date-input"
                    type="date"
                    value={taskDate}
                    onChange={(e) => setTaskDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--bg3)',
                      color: 'var(--text)',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>
                <div className="form-field" style={{ flex: 1 }}>
                  <label htmlFor="task-time-input">Due Time (Optional)</label>
                  <input
                    id="task-time-input"
                    type="time"
                    value={taskTime}
                    onChange={(e) => setTaskTime(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--bg3)',
                      color: 'var(--text)',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Repeat settings field */}
              <div className="form-field" style={{ marginTop: 12 }}>
                <label htmlFor="task-repeat-select">Repeat</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select
                    id="task-repeat-select"
                    value={repeatType}
                    onChange={(e) => {
                      const val = e.target.value as 'none' | 'daily' | 'custom';
                      if (val === 'custom') {
                        openCustomRepeatModal();
                      } else {
                        setRepeatType(val);
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--bg3)',
                      color: 'var(--text)',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  >
                    <option value="none">None</option>
                    <option value="daily">Daily</option>
                    <option value="custom">Custom...</option>
                  </select>
                  {repeatType === 'custom' && (
                    <button
                      type="button"
                      onClick={openCustomRepeatModal}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'var(--bg3)',
                        color: 'var(--accent)',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Edit Rule
                    </button>
                  )}
                </div>
                {repeatType === 'custom' && (
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>
                    Rule: Every {customEvery} {customUnit}{customEvery > 1 ? 's' : ''}
                    {customUnit === 'week' && customDays.length > 0 && (
                      ` on ${customDays.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}`
                    )}
                    {customEnds === 'on' && customEndsOn && ` until ${customEndsOn}`}
                    {customEnds === 'after' && ` for ${customEndsAfter} times`}
                  </div>
                )}
              </div>

              <div className="modal-actions" style={{ marginTop: 20 }}>
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

      {/* Custom Recurrence picker Modal overlay */}
      {isCustomRepeatOpen && (
        <div
          className="modal-overlay open"
          style={{ zIndex: 1000 }}
          onClick={(e) => e.target === e.currentTarget && setIsCustomRepeatOpen(false)}
        >
          <div className="modal recurrence-modal" style={{ maxWidth: 360 }}>
            <div className="modal-title">Repeats every</div>
            
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
              <input
                type="number"
                min="1"
                value={tempEvery}
                onChange={(e) => setTempEvery(Math.max(1, parseInt(e.target.value, 10) || 1))}
                style={{
                  width: 70,
                  padding: '10px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--bg3)',
                  color: 'var(--text)',
                  fontSize: 14,
                  textAlign: 'center',
                  outline: 'none',
                }}
              />
              <select
                value={tempUnit}
                onChange={(e) => setTempUnit(e.target.value as any)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--bg3)',
                  color: 'var(--text)',
                  fontSize: 14,
                  outline: 'none',
                }}
              >
                <option value="day">day</option>
                <option value="week">week</option>
                <option value="month">month</option>
                <option value="year">year</option>
              </select>
            </div>

            {tempUnit === 'week' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayChar, index) => {
                  const isSelected = tempDays.includes(index);
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setTempDays(tempDays.filter(d => d !== index));
                        } else {
                          setTempDays([...tempDays, index]);
                        }
                      }}
                      className={`weekday-btn ${isSelected ? 'active' : ''}`}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        border: 'none',
                        background: isSelected ? 'var(--accent)' : 'var(--bg3)',
                        color: isSelected ? '#fff' : 'var(--text)',
                        fontSize: 12,
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}
                    >
                      {dayChar}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="form-field" style={{ marginBottom: 20 }}>
              <label>Set time</label>
              <input
                type="time"
                value={taskTime}
                onChange={(e) => setTaskTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--bg3)',
                  color: 'var(--text)',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--text2)', marginBottom: 12 }}>Ends</div>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 12, fontSize: 14 }}>
                <input
                  type="radio"
                  name="ends"
                  checked={tempEnds === 'never'}
                  onChange={() => setTempEnds('never')}
                  style={{ accentColor: 'var(--accent)' }}
                />
                <span>Never</span>
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, fontSize: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flexShrink: 0 }}>
                  <input
                    type="radio"
                    name="ends"
                    checked={tempEnds === 'on'}
                    onChange={() => setTempEnds('on')}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <span>On</span>
                </label>
                <input
                  type="date"
                  disabled={tempEnds !== 'on'}
                  value={tempEndsOn}
                  onChange={(e) => setTempEndsOn(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: tempEnds === 'on' ? 'var(--bg3)' : 'var(--bg)',
                    color: tempEnds === 'on' ? 'var(--text)' : 'var(--text3)',
                    fontSize: 13,
                    outline: 'none',
                    opacity: tempEnds === 'on' ? 1 : 0.6,
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flexShrink: 0 }}>
                  <input
                    type="radio"
                    name="ends"
                    checked={tempEnds === 'after'}
                    onChange={() => setTempEnds('after')}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <span>After</span>
                </label>
                <input
                  type="number"
                  min="1"
                  disabled={tempEnds !== 'after'}
                  value={tempEndsAfter}
                  onChange={(e) => setTempEndsAfter(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  style={{
                    width: 70,
                    padding: '8px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: tempEnds === 'after' ? 'var(--bg3)' : 'var(--bg)',
                    color: tempEnds === 'after' ? 'var(--text)' : 'var(--text3)',
                    fontSize: 13,
                    textAlign: 'center',
                    outline: 'none',
                    opacity: tempEnds === 'after' ? 1 : 0.6,
                  }}
                />
                <span style={{ color: 'var(--text3)', fontSize: 13 }}>occurrences</span>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: 24, justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  setIsCustomRepeatOpen(false);
                  if (repeatType !== 'custom') {
                    setRepeatType('none');
                  }
                }}
                style={{ flex: 'none', padding: '10px 16px', background: 'transparent', border: 'none', color: 'var(--text2)', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-save"
                onClick={() => {
                  setCustomEvery(tempEvery);
                  setCustomUnit(tempUnit);
                  setCustomDays(tempDays);
                  setCustomEnds(tempEnds);
                  setCustomEndsOn(tempEndsOn);
                  setCustomEndsAfter(tempEndsAfter);
                  setRepeatType('custom');
                  setIsCustomRepeatOpen(false);
                }}
                style={{
                  flex: 'none',
                  padding: '10px 24px',
                  borderRadius: 24,
                  background: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

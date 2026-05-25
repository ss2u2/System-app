import React, { useState, useEffect, useRef } from 'react';
import {
  IconArrowLeft,
  IconStar,
  IconStarFilled,
  IconDotsVertical,
  IconTrash,
  IconChevronDown,
  IconCalendarTime,
  IconClock,
  IconRepeat,
  IconAlignLeft,
  IconCornerDownRight,
  IconX,
  IconPlus,
  IconCheck,
} from '@tabler/icons-react';
import type { SubTask } from '../types';
import { store } from '../services/db';
import { parseTask, formatTaskDate, formatTaskTime, generateSecureNumericId } from '../utils/taskHelper';
import Button from './ui/Button';
import Dropdown, { DropdownItem } from './ui/Dropdown';
import Modal from './ui/Modal';
import FormField from './ui/FormField';

interface TaskDetailViewProps {
  taskId: number | string;
  lists: { id: number | string; name: string }[];
  onClose: () => void;
  onDelete: (id: number | string) => void;
  onToggleComplete: (id: number | string) => void;
}

export default function TaskDetailView({
  taskId,
  lists,
  onClose,
  onDelete,
  onToggleComplete,
}: TaskDetailViewProps) {
  // Fetch fresh state on mount / taskId change
  const state = store.getState();
  const rawTask = state.tasks.find((t) => t.id === taskId);
  
  if (!rawTask) {
    return null;
  }

  const parsed = parseTask(rawTask);

  // Form states
  const [name, setName] = useState(parsed.name);
  const [listId, setListId] = useState(parsed.listId);
  const [starred, setStarred] = useState(parsed.starred);
  const [done, setDone] = useState(parsed.done);
  
  // Date & Time states
  const [date, setDate] = useState(parsed.date || '');
  const [time, setTime] = useState(parsed.time || '');
  const [repeatType, setRepeatType] = useState<string>(parsed.repeatType || 'none');
  const [repeatValue, setRepeatValue] = useState<string>(parsed.repeatValue || '');

  // Deadline state
  const [deadline, setDeadline] = useState(parsed.deadline || '');

  // Details state
  const [details, setDetails] = useState(parsed.details || '');

  // Subtasks state
  const [subtasks, setSubtasks] = useState<SubTask[]>(parsed.subtasks || []);
  const [newSubtaskText, setNewSubtaskText] = useState('');

  // Dropdowns / Modals visibility
  const [isDateTimeModalOpen, setIsDateTimeModalOpen] = useState(false);
  const [isCustomRepeatOpen, setIsCustomRepeatOpen] = useState(false);
  
  // Conflict warning modals
  const [conflictType, setConflictType] = useState<'repeat-warning' | 'deadline-warning' | null>(null);
  const [pendingDeadline, setPendingDeadline] = useState('');
  const [pendingRepeat, setPendingRepeat] = useState<{ type: string; val: string }>({ type: 'none', val: '' });

  // Temp Date/Time/Repeat settings for the modal
  const [tempDate, setTempDate] = useState('');
  const [tempTime, setTempTime] = useState('');
  const [tempRepeatType, setTempRepeatType] = useState<string>('none');
  const [tempEvery, setTempEvery] = useState(1);
  const [tempUnit, setTempUnit] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [tempDays, setTempDays] = useState<number[]>([]);
  const [tempEnds, setTempEnds] = useState<'never' | 'on' | 'after'>('never');
  const [tempEndsOn, setTempEndsOn] = useState('');
  const [tempEndsAfter, setTempEndsAfter] = useState(13);

  // Refs
  const deadlineInputRef = useRef<HTMLInputElement>(null);
  const detailsRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize details textarea on load/change
  useEffect(() => {
    if (detailsRef.current) {
      detailsRef.current.style.height = 'auto';
      detailsRef.current.style.height = `${detailsRef.current.scrollHeight}px`;
    }
  }, [details]);

  // Sync state back to store whenever critical values change
  const saveTaskDetails = (
    currentName = name,
    currentListId = listId,
    currentStarred = starred,
    currentDone = done,
    currentDate = date,
    currentTime = time,
    currentRepeatType = repeatType,
    currentRepeatValue = repeatValue,
    currentDeadline = deadline,
    currentDetails = details,
    currentSubtasks = subtasks
  ) => {
    const freshState = store.getState();
    const updatedTasks = freshState.tasks.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          name: currentName.trim() || 'Untitled Task',
          done: currentDone,
          listId: currentListId,
          starred: currentStarred,
          date: currentDate || undefined,
          time: currentTime || undefined,
          repeatType: currentRepeatType,
          repeatValue: currentRepeatValue,
          deadline: currentDeadline || undefined,
          details: currentDetails || undefined,
          subtasks: currentSubtasks,
          cat: ''
        };
      }
      return t;
    });
    store.setState({ tasks: updatedTasks });
  };

  // Close and Save
  const handleClose = () => {
    saveTaskDetails();
    onClose();
  };

  // Delete
  const handleDelete = () => {
    if (window.confirm('Delete this task?')) {
      onDelete(taskId);
      onClose();
    }
  };

  // Toggle Completion
  const handleToggleCompleteDetail = () => {
    const nextDone = !done;
    setDone(nextDone);
    saveTaskDetails(
      name,
      listId,
      starred,
      nextDone,
      date,
      time,
      repeatType,
      repeatValue,
      deadline,
      details,
      subtasks
    );
    // If completed, let the parent component trigger repeat spawning
    onToggleComplete(taskId);
    onClose();
  };

  // Star Toggle
  const handleStarToggle = () => {
    const nextStarred = !starred;
    setStarred(nextStarred);
    saveTaskDetails(name, listId, nextStarred);
  };

  // Deadline selection click
  const handleDeadlineClick = () => {
    if (deadlineInputRef.current) {
      deadlineInputRef.current.showPicker();
    }
  };

  // Deadline change handler
  const handleDeadlineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value;
    if (!selectedDate) return;

    if (repeatType !== 'none') {
      // Conflict! Repeating task cannot have a deadline.
      setPendingDeadline(selectedDate);
      setConflictType('deadline-warning');
    } else {
      setDeadline(selectedDate);
      saveTaskDetails(
        name,
        listId,
        starred,
        done,
        date,
        time,
        repeatType,
        repeatValue,
        selectedDate
      );
    }
  };

  // Clear Deadline
  const handleClearDeadline = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeadline('');
    saveTaskDetails(
      name,
      listId,
      starred,
      done,
      date,
      time,
      repeatType,
      repeatValue,
      ''
    );
  };

  // Date/Time Modal Save
  const openDateTimeModal = () => {
    setTempDate(date);
    setTempTime(time);
    setTempRepeatType(repeatType);

    if (repeatType === 'custom' && repeatValue) {
      try {
        const config = JSON.parse(repeatValue);
        setTempEvery(config.every || 1);
        setTempUnit(config.unit || 'week');
        setTempDays(config.days || []);
        setTempEnds(config.ends || 'never');
        setTempEndsOn(config.endsOn || '');
        setTempEndsAfter(config.endsAfter || 13);
      } catch (err) {
        console.error(err);
      }
    } else {
      setTempEvery(1);
      setTempUnit('week');
      setTempDays([]);
      setTempEnds('never');
      setTempEndsOn('');
      setTempEndsAfter(13);
    }
    setIsDateTimeModalOpen(true);
  };

  const handleSaveDateTime = () => {
    let finalRepeatVal = '';
    if (tempRepeatType === 'custom') {
      finalRepeatVal = JSON.stringify({
        every: tempEvery,
        unit: tempUnit,
        days: tempDays,
        ends: tempEnds,
        endsOn: tempEndsOn,
        endsAfter: tempEndsAfter,
      });
    }

    if (tempRepeatType !== 'none' && deadline) {
      // Conflict! Making this task repeat will remove the deadline.
      setPendingRepeat({ type: tempRepeatType, val: finalRepeatVal });
      setConflictType('repeat-warning');
    } else {
      setDate(tempDate);
      setTime(tempTime);
      setRepeatType(tempRepeatType);
      setRepeatValue(finalRepeatVal);
      saveTaskDetails(
        name,
        listId,
        starred,
        done,
        tempDate,
        tempTime,
        tempRepeatType,
        finalRepeatVal,
        deadline
      );
      setIsDateTimeModalOpen(false);
    }
  };

  // Conflict Resolution: Repeat task anyway (clears deadline)
  const handleResolveRepeatAnyway = () => {
    // Clear deadline, apply repeat
    setDeadline('');
    setDate(tempDate);
    setTime(tempTime);
    setRepeatType(pendingRepeat.type);
    setRepeatValue(pendingRepeat.val);

    saveTaskDetails(
      name,
      listId,
      starred,
      done,
      tempDate,
      tempTime,
      pendingRepeat.type,
      pendingRepeat.val,
      '' // cleared deadline
    );

    setConflictType(null);
    setIsDateTimeModalOpen(false);
  };

  // Conflict Resolution: Set deadline anyway (clears repeat schedule)
  const handleResolveDeadlineAnyway = () => {
    // Clear repeat, apply deadline
    setDeadline(pendingDeadline);
    setRepeatType('none');
    setRepeatValue('');

    saveTaskDetails(
      name,
      listId,
      starred,
      done,
      date,
      time,
      'none', // cleared repeatType
      '', // cleared repeatValue
      pendingDeadline
    );

    setConflictType(null);
  };

  // Subtasks actions
  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskText.trim()) return;

    const newSub: SubTask = {
      id: generateSecureNumericId(),
      name: newSubtaskText.trim(),
      done: false,
    };
    const updatedSubs = [...subtasks, newSub];
    setSubtasks(updatedSubs);
    setNewSubtaskText('');
    saveTaskDetails(
      name,
      listId,
      starred,
      done,
      date,
      time,
      repeatType,
      repeatValue,
      deadline,
      details,
      updatedSubs
    );
  };

  const handleToggleSubtask = (subId: number | string) => {
    const updatedSubs = subtasks.map((st) => {
      if (st.id === subId) {
        return { ...st, done: !st.done };
      }
      return st;
    });
    setSubtasks(updatedSubs);
    saveTaskDetails(
      name,
      listId,
      starred,
      done,
      date,
      time,
      repeatType,
      repeatValue,
      deadline,
      details,
      updatedSubs
    );
  };

  const handleSubtaskNameChange = (subId: number | string, newName: string) => {
    const updatedSubs = subtasks.map((st) => {
      if (st.id === subId) {
        return { ...st, name: newName };
      }
      return st;
    });
    setSubtasks(updatedSubs);
    saveTaskDetails(
      name,
      listId,
      starred,
      done,
      date,
      time,
      repeatType,
      repeatValue,
      deadline,
      details,
      updatedSubs
    );
  };

  const handleDeleteSubtask = (subId: number | string) => {
    const updatedSubs = subtasks.filter((st) => st.id !== subId);
    setSubtasks(updatedSubs);
    saveTaskDetails(
      name,
      listId,
      starred,
      done,
      date,
      time,
      repeatType,
      repeatValue,
      deadline,
      details,
      updatedSubs
    );
  };

  // Render format for Repeat display string
  const getRepeatDisplay = () => {
    if (repeatType === 'daily') return 'Daily';
    if (repeatType === 'custom' && repeatValue) {
      try {
        const config = JSON.parse(repeatValue);
        return `Every ${config.every} ${config.unit}${config.every > 1 ? 's' : ''}`;
      } catch (err) {
        return 'Custom';
      }
    }
    return '';
  };

  const activeListName = lists.find((l) => l.id === Number(listId))?.name || 'My Tasks';

  return (
    <div className="task-detail-overlay">
      {/* Top Bar */}
      <div className="task-detail-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="task-detail-back-btn" onClick={handleClose}>
            <IconArrowLeft size={22} />
          </button>
          
          {/* List Selector Dropdown */}
          <Dropdown
            align="left"
            trigger={
              <button className="task-detail-list-select-btn">
                <span>{activeListName}</span>
                <IconChevronDown size={14} />
              </button>
            }
          >
            {lists.map((l) => (
              <DropdownItem
                key={l.id}
                className={String(l.id) === String(listId) ? 'active-sort' : ''}
                onClick={() => {
                  setListId(l.id);
                  saveTaskDetails(name, l.id);
                }}
              >
                {l.name}
              </DropdownItem>
            ))}
          </Dropdown>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Star toggle */}
          <button className={`task-detail-action-btn ${starred ? 'starred' : ''}`} onClick={handleStarToggle}>
            {starred ? <IconStarFilled size={20} /> : <IconStar size={20} />}
          </button>

          {/* Menu Dropdown */}
          <Dropdown
            align="right"
            trigger={
              <button className="task-detail-action-btn">
                <IconDotsVertical size={20} />
              </button>
            }
          >
            <DropdownItem variant="danger" onClick={handleDelete}>
              <IconTrash size={14} />
              Delete Task
            </DropdownItem>
          </Dropdown>
        </div>
      </div>

      {/* Detail Scrollable Body */}
      <div className="task-detail-body">
        {/* Title input */}
        <input
          type="text"
          className="task-detail-title-input"
          value={name}
          placeholder="Enter title"
          onChange={(e) => {
            setName(e.target.value);
            saveTaskDetails(e.target.value);
          }}
        />

        {/* Rows of settings */}
        <div className="task-detail-rows-container">
          
          {/* 1. Details Row */}
          <div className="task-detail-row align-start">
            <div className="task-detail-row-icon">
              <IconAlignLeft size={20} />
            </div>
            <div className="task-detail-row-content">
              <textarea
                ref={detailsRef}
                className="task-detail-textarea"
                value={details}
                placeholder="Add details"
                rows={1}
                onChange={(e) => {
                  setDetails(e.target.value);
                  saveTaskDetails(
                    name,
                    listId,
                    starred,
                    done,
                    date,
                    time,
                    repeatType,
                    repeatValue,
                    deadline,
                    e.target.value
                  );
                }}
              />
            </div>
          </div>

          {/* 2. Deadline Row */}
          <div className="task-detail-row">
            <div className="task-detail-row-icon">
              <IconCalendarTime size={20} />
            </div>
            <div className="task-detail-row-content">
              <input
                ref={deadlineInputRef}
                type="date"
                style={{ display: 'none' }}
                value={deadline}
                onChange={handleDeadlineChange}
              />
              {deadline ? (
                <div className="task-detail-pill deadline-pill" onClick={handleDeadlineClick}>
                  <span>Due {formatTaskDate(deadline)}</span>
                  <button className="pill-clear-btn" onClick={handleClearDeadline}>
                    <IconX size={12} />
                  </button>
                </div>
              ) : (
                <button className="task-detail-add-row-btn" onClick={handleDeadlineClick}>
                  Add deadline
                </button>
              )}
            </div>
          </div>

          {/* 3. Date / Time & Repeat Row */}
          <div className="task-detail-row">
            <div className="task-detail-row-icon">
              <IconClock size={20} />
            </div>
            <div className="task-detail-row-content">
              {date ? (
                <div className="task-detail-pill" onClick={openDateTimeModal}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{formatTaskDate(date)}</span>
                    {time && <span>, {formatTaskTime(time)}</span>}
                    {repeatType !== 'none' && (
                      <span className="pill-repeat-indicator">
                        <IconRepeat size={12} />
                        <span>{getRepeatDisplay()}</span>
                      </span>
                    )}
                  </div>
                  <button
                    className="pill-clear-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDate('');
                      setTime('');
                      setRepeatType('none');
                      setRepeatValue('');
                      saveTaskDetails(
                        name,
                        listId,
                        starred,
                        done,
                        '',
                        '',
                        'none',
                        '',
                        deadline
                      );
                    }}
                  >
                    <IconX size={12} />
                  </button>
                </div>
              ) : (
                <button className="task-detail-add-row-btn" onClick={openDateTimeModal}>
                  Add date/time
                </button>
              )}
            </div>
          </div>

          {/* 4. Subtasks Section */}
          <div className="task-detail-row align-start">
            <div className="task-detail-row-icon" style={{ marginTop: 2 }}>
              <IconCornerDownRight size={20} />
            </div>
            <div className="task-detail-row-content" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Header / Button */}
              {subtasks.length === 0 ? (
                <button
                  className="task-detail-add-row-btn"
                  onClick={() => {
                    const el = document.getElementById('new-subtask-input');
                    if (el) el.focus();
                  }}
                >
                  Add subtasks
                </button>
              ) : (
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 4 }}>Subtasks</span>
              )}

              {/* Subtask Rows */}
              <div className="task-detail-subtasks-list">
                {subtasks.map((st) => (
                  <div key={st.id} className={`task-detail-subtask-item ${st.done ? 'completed' : ''}`}>
                    <button
                      className={`task-detail-subtask-checkbox ${st.done ? 'checked' : ''}`}
                      onClick={() => handleToggleSubtask(st.id)}
                    >
                      {st.done && <IconCheck size={10} strokeWidth={3} />}
                    </button>
                    <input
                      type="text"
                      className="task-detail-subtask-input"
                      value={st.name}
                      onChange={(e) => handleSubtaskNameChange(st.id, e.target.value)}
                    />
                    <button
                      className="task-detail-subtask-delete"
                      onClick={() => handleDeleteSubtask(st.id)}
                    >
                      <IconX size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Subtask Input Form */}
              <form onSubmit={handleAddSubtask} className="task-detail-subtask-form">
                <IconPlus size={14} className="form-plus-icon" />
                <input
                  id="new-subtask-input"
                  type="text"
                  placeholder="Add subtask"
                  value={newSubtaskText}
                  onChange={(e) => setNewSubtaskText(e.target.value)}
                />
              </form>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="task-detail-bottom-bar" style={{ gap: '12px', display: 'flex' }}>
        <Button
          onClick={handleToggleCompleteDetail}
          className="task-detail-complete-btn secondary"
          style={{ flex: 1 }}
        >
          {done ? 'Mark uncompleted' : 'Mark completed'}
        </Button>
        <Button
          variant="primary"
          onClick={handleClose}
          className="task-detail-complete-btn"
          style={{ flex: 1 }}
        >
          Done
        </Button>
      </div>

      {/* ==================== DATE TIME REPEAT MODAL ==================== */}
      <Modal
        isOpen={isDateTimeModalOpen}
        onClose={() => setIsDateTimeModalOpen(false)}
        title="Edit Date/Time & Repeat"
      >
        <FormField label="Due Date (Optional)" htmlFor="detail-date-input">
          <input
            id="detail-date-input"
            type="date"
            value={tempDate}
            onChange={(e) => setTempDate(e.target.value)}
            className="ui-input"
          />
        </FormField>

        <FormField label="Due Time (Optional)" htmlFor="detail-time-input">
          <input
            id="detail-time-input"
            type="time"
            value={tempTime}
            onChange={(e) => setTempTime(e.target.value)}
            className="ui-input"
          />
        </FormField>

        <FormField label="Repeat" htmlFor="detail-repeat-select">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              id="detail-repeat-select"
              value={tempRepeatType}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'custom') {
                  setIsCustomRepeatOpen(true);
                } else {
                  setTempRepeatType(val);
                }
              }}
              className="ui-select"
              style={{ flex: 1 }}
            >
              <option value="none">None</option>
              <option value="daily">Daily</option>
              <option value="custom">Custom...</option>
            </select>
            {tempRepeatType === 'custom' && (
              <Button
                type="button"
                onClick={() => setIsCustomRepeatOpen(true)}
                style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, minWidth: 'auto' }}
              >
                Edit Rule
              </Button>
            )}
          </div>
          {tempRepeatType === 'custom' && (
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>
              Rule: Every {tempEvery} {tempUnit}{tempEvery > 1 ? 's' : ''}
              {tempUnit === 'week' && tempDays.length > 0 && (
                ` on ${tempDays.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}`
              )}
              {tempEnds === 'on' && tempEndsOn && ` until ${tempEndsOn}`}
              {tempEnds === 'after' && ` for ${tempEndsAfter} times`}
            </div>
          )}
        </FormField>

        <div className="modal-actions" style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
          <Button type="button" onClick={() => setIsDateTimeModalOpen(false)} style={{ flex: 1 }}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={handleSaveDateTime} style={{ flex: 1 }}>
            Done
          </Button>
        </div>
      </Modal>

      {/* ==================== CUSTOM RECURRENCE MODAL ==================== */}
      <Modal
        isOpen={isCustomRepeatOpen}
        onClose={() => setIsCustomRepeatOpen(false)}
        title="Repeats every"
        maxWidth="360px"
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
          <input
            type="number"
            min="1"
            value={tempEvery}
            onChange={(e) => setTempEvery(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="ui-input"
            style={{
              width: 70,
              textAlign: 'center',
            }}
          />
          <select
            value={tempUnit}
            onChange={(e) => setTempUnit(e.target.value as any)}
            className="ui-select"
            style={{
              flex: 1,
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

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--text2)', marginBottom: 12 }}>Ends</div>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 12, fontSize: 14 }}>
            <input
              type="radio"
              name="ends-detail"
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
                name="ends-detail"
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
              className="ui-input"
              style={{
                flex: 1,
                opacity: tempEnds === 'on' ? 1 : 0.6,
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flexShrink: 0 }}>
              <input
                type="radio"
                name="ends-detail"
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
              className="ui-input"
              style={{
                width: 70,
                textAlign: 'center',
                opacity: tempEnds === 'after' ? 1 : 0.6,
              }}
            />
            <span style={{ color: 'var(--text3)', fontSize: 13 }}>occurrences</span>
          </div>
        </div>

        <div className="modal-actions" style={{ display: 'flex', gap: '8px', marginTop: 24 }}>
          <Button
            type="button"
            onClick={() => setIsCustomRepeatOpen(false)}
            style={{ flex: 1 }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              setTempRepeatType('custom');
              setIsCustomRepeatOpen(false);
            }}
            style={{ flex: 1 }}
          >
            Done
          </Button>
        </div>
      </Modal>

      {/* ==================== CONFLICT RESOLUTION WARNING MODALS ==================== */}
      <Modal
        isOpen={conflictType !== null}
        onClose={() => setConflictType(null)}
        title="Repeating tasks cannot have a deadline"
      >
        <div className="warning-desc" style={{ marginBottom: 16, color: 'var(--text2)' }}>
          {conflictType === 'repeat-warning'
            ? 'Making this task repeat will remove the deadline'
            : 'Setting a deadline will remove the repeat schedule'}
        </div>
        <div className="warning-actions" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Button
            variant="danger"
            onClick={
              conflictType === 'repeat-warning' ? handleResolveRepeatAnyway : handleResolveDeadlineAnyway
            }
            fullWidth
          >
            {conflictType === 'repeat-warning' ? 'Repeat task anyway' : 'Set deadline anyway'}
          </Button>
          <Button variant="secondary" onClick={() => setConflictType(null)} fullWidth>
            Back to editing
          </Button>
        </div>
      </Modal>
    </div>
  );
}

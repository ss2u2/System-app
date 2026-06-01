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
import ConfirmationModal from './ui/ConfirmationModal';
import type { SubTask } from '../types';
import { store } from '../services/db';
import { parseTask, formatTaskDate, formatTaskTime, generateSecureNumericId, formatRepeatValue } from '../utils/taskHelper';
import Button from './ui/Button';
import Dropdown, { DropdownItem } from './ui/Dropdown';
import Modal from './ui/Modal';
import CalendarPickerModal from './CalendarPickerModal';

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
  const rawTask = (state.tasks || []).find((t) => String(t.id) === String(taskId));
  
  const parsed = rawTask ? parseTask(rawTask) : {
    name: '',
    listId: 1001,
    starred: false,
    done: false,
    date: '',
    time: '',
    repeatType: 'none',
    repeatValue: '',
    deadline: '',
    details: '',
    subtasks: [],
    createdAt: Date.now()
  };

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
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarTab, setCalendarTab] = useState<'date' | 'deadline'>('date');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Conflict warning modals
  const [conflictType, setConflictType] = useState<'repeat-warning' | null>(null);
  const [pendingRepeat, setPendingRepeat] = useState<{ type: string; val: string }>({ type: 'none', val: '' });

  // Temp Date/Time/Repeat settings for holding conflict resolutions
  const [tempDate, setTempDate] = useState('');
  const [tempTime, setTempTime] = useState('');

  // Refs
  const detailsRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize details textarea on load/change
  useEffect(() => {
    if (detailsRef.current) {
      detailsRef.current.style.height = 'auto';
      detailsRef.current.style.height = `${detailsRef.current.scrollHeight}px`;
    }
  }, [details]);

  // Early return if task doesn't exist (done after hook declarations)
  if (!rawTask) {
    return null;
  }

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
      if (String(t.id) === String(taskId)) {
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
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    onDelete(taskId);
    onClose();
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
    setCalendarTab('deadline');
    setIsCalendarOpen(true);
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
    setCalendarTab('date');
    setIsCalendarOpen(true);
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
    setIsCalendarOpen(false);
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
    return formatRepeatValue(repeatType, repeatValue, time);
  };

  const activeListName = lists.find((l) => l.id === Number(listId))?.name || 'My Tasks';

  return (
    <>
      <div className="task-detail-backdrop" onClick={handleClose} />
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
                <span className="dropdown-item-text">{l.name}</span>
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

        {/* Creation Date and Time */}
        <div 
          className="task-detail-created-at"
          style={{ 
            fontSize: '12px', 
            fontWeight: 500, 
            color: 'var(--text3)', 
            marginTop: '-16px', 
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <span>Created on {new Date(parsed.createdAt).toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric', 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
          })}</span>
        </div>

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

          {/* 3.5 Repeat Row */}
          {(date || repeatType !== 'none') && (
            <div className="task-detail-row" style={{ marginTop: 4 }}>
              <div className="task-detail-row-icon">
                <IconRepeat size={20} />
              </div>
              <div className="task-detail-row-content">
                {repeatType !== 'none' ? (
                  <div className="task-detail-pill" onClick={openDateTimeModal} style={{ width: '100%', justifyContent: 'space-between', display: 'flex' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{getRepeatDisplay()}</span>
                    </div>
                    <button
                      className="pill-clear-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRepeatType('none');
                        setRepeatValue('');
                        saveTaskDetails(
                          name,
                          listId,
                          starred,
                          done,
                          date,
                          time,
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
                    Add repeat
                  </button>
                )}
              </div>
            </div>
          )}

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
      <div className="task-detail-bottom-bar">
        <Button
          onClick={handleToggleCompleteDetail}
          className="task-detail-complete-btn secondary"
        >
          {done ? 'Mark uncompleted' : 'Mark completed'}
        </Button>
        <Button
          variant="primary"
          onClick={handleClose}
          className="task-detail-complete-btn"
        >
          Done
        </Button>
      </div>

      {/* ==================== CALENDAR SCHEDULER PICKER MODAL ==================== */}
      <CalendarPickerModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        initialTab={calendarTab}
        date={date}
        time={time}
        deadline={deadline}
        repeatType={repeatType}
        repeatValue={repeatValue}
        onSave={(data) => {
          if (data.repeatType !== 'none' && data.deadline) {
            setPendingRepeat({ type: data.repeatType, val: data.repeatValue });
            setTempDate(data.date);
            setTempTime(data.time);
            setConflictType('repeat-warning');
          } else {
            setDate(data.date);
            setTime(data.time);
            setDeadline(data.deadline);
            setRepeatType(data.repeatType);
            setRepeatValue(data.repeatValue);
            saveTaskDetails(
              name,
              listId,
              starred,
              done,
              data.date,
              data.time,
              data.repeatType,
              data.repeatValue,
              data.deadline,
              details,
              subtasks
            );
          }
        }}
      />

      {/* ==================== CONFLICT RESOLUTION WARNING MODALS ==================== */}
      <Modal
        isOpen={conflictType !== null}
        onClose={() => setConflictType(null)}
        title="Repeating tasks cannot have a deadline"
      >
        <div className="warning-desc" style={{ marginBottom: 16, color: 'var(--text2)' }}>
          This task cannot have both a deadline and a repeat schedule. Which one do you want to keep?
        </div>
        <div className="warning-actions" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Button
            variant="danger"
            onClick={handleResolveRepeatAnyway}
            fullWidth
          >
            Keep repeat schedule
          </Button>
          <Button variant="secondary" onClick={() => setConflictType(null)} fullWidth>
            Back to editing
          </Button>
        </div>
      </Modal>

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete this task?"
        confirmLabel="Delete"
      />
    </div>
    </>
  );
}

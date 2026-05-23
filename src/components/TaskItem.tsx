import React, { useState } from 'react';
import {
  IconStar,
  IconStarFilled,
  IconCheck,
  IconTrash,
  IconCalendar,
  IconRepeat,
  IconChevronDown,
  IconCircleCheck,
} from '@tabler/icons-react';
import { formatTaskTime, getRelativeTimeString, parseTask, formatTaskDate } from '../utils/taskHelper';
import type { Task } from '../types';
import { store } from '../services/db';

interface TaskItemProps {
  task: Task;
  onToggle: (id: number) => void;
  onToggleStar?: (id: number, e: React.MouseEvent) => void;
  onDelete: (id: number, e: React.MouseEvent) => void;
  onEdit?: (id: number) => void;
  isDragging?: boolean;
}

export default function TaskItem({
  task,
  onToggle,
  onToggleStar,
  onDelete,
  onEdit,
  isDragging,
}: TaskItemProps) {
  const parsed = parseTask(task);
  const [isExpanded, setIsExpanded] = useState(true);

  // Auto-collapse when dragging starts
  React.useEffect(() => {
    if (isDragging) {
      setIsExpanded(false);
    }
  }, [isDragging]);

  const showSubtasks = isDragging ? false : isExpanded;
  const subtasksTransition = isDragging
    ? 'none'
    : 'grid-template-rows 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease';

  return (
    <div
      className={`custom-task-row ${parsed.done ? 'done' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={() => onEdit?.(parsed.id)}
    >
      {/* Checkbox */}
      <div
        className={`custom-task-checkbox ${parsed.done ? 'done' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggle(parsed.id);
        }}
      >
        {parsed.done ? (
          <IconCheck size={10} strokeWidth={3} />
        ) : (
          <div className="checkbox-inner" />
        )}
      </div>

      {/* Details */}
      <div className="custom-task-details">
        <span className="custom-task-name">{parsed.name}</span>
        
        {/* Date and Deadline display */}
        <span className="custom-task-time" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          {/* Deadline */}
          {parsed.deadline && (
            <span className="task-deadline-span" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <IconCircleCheck size={12} />
              <span>Due {formatTaskDate(parsed.deadline)}</span>
            </span>
          )}

          {/* Scheduled Date/Time */}
          {parsed.date ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <IconCalendar size={12} />
              <span>{formatTaskDate(parsed.date)}{parsed.time ? `, ${formatTaskTime(parsed.time)}` : ''}</span>
            </span>
          ) : !parsed.deadline ? (
            <span>{getRelativeTimeString(parsed.createdAt)}</span>
          ) : null}

          {/* Repeat Badge */}
          {parsed.repeatType && parsed.repeatType !== 'none' && (
            <span className="repeat-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <IconRepeat size={12} />
              <span>
                {parsed.repeatType === 'daily' ? 'Daily' : (() => {
                  try {
                    const config = JSON.parse(parsed.repeatValue || '{}');
                    return `Every ${config.every} ${config.unit}${config.every > 1 ? 's' : ''}`;
                  } catch (e) {
                    return 'Custom';
                  }
                })()}
              </span>
            </span>
          )}
        </span>

        {/* Subtasks checklist */}
        {parsed.subtasks && parsed.subtasks.length > 0 && (
          <div
            className="task-item-subtasks-wrapper"
            style={{
              display: 'grid',
              gridTemplateRows: showSubtasks ? '1fr' : '0fr',
              opacity: showSubtasks ? 1 : 0,
              transition: subtasksTransition,
              marginTop: showSubtasks ? '8px' : '0px',
              paddingLeft: '4px',
            }}
            onClick={(e) => e.stopPropagation()} // prevent opening edit view
          >
            <div style={{ overflow: 'hidden' }}>
              {parsed.subtasks.map((st) => (
                <div
                  key={st.id}
                  className={`task-item-subtask-row ${st.done ? 'done' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '4px 0',
                  }}
                >
                  <button
                    className={`task-item-subtask-cb ${st.done ? 'checked' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      const updatedSubs = parsed.subtasks!.map((s) =>
                        s.id === st.id ? { ...s, done: !s.done } : s
                      );
                      
                      // Save back to db
                      const freshState = store.getState();
                      const updatedTasks = freshState.tasks.map((t) => {
                        if (t.id === parsed.id) {
                          const parts = t.cat.split('|');
                          parts[10] = encodeURIComponent(JSON.stringify(updatedSubs));
                          return { ...t, cat: parts.join('|') };
                        }
                        return t;
                      });
                      store.setState({ tasks: updatedTasks });
                    }}
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      border: '2px solid var(--text3)',
                      background: st.done ? 'var(--text)' : 'transparent',
                      color: 'var(--bg2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: 0,
                      transition: 'all 0.15s',
                      flexShrink: 0,
                    }}
                  >
                    {st.done && <IconCheck size={10} strokeWidth={3} />}
                  </button>
                  <span
                    className="task-item-subtask-name"
                    style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      color: st.done ? 'var(--text3)' : 'var(--text2)',
                      textDecoration: st.done ? 'line-through' : 'none',
                      opacity: st.done ? 0.7 : 1,
                    }}
                  >
                    {st.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="custom-task-actions">
        {/* Collapse/Expand Toggle for Subtasks */}
        {parsed.subtasks && parsed.subtasks.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className={`custom-task-collapse-btn ${isExpanded ? 'expanded' : ''}`}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text3)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.2s',
              transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
            }}
          >
            <IconChevronDown size={18} />
          </button>
        )}

        {onToggleStar && (
          <button
            onClick={(e) => onToggleStar(parsed.id, e)}
            className={`custom-task-star-btn ${parsed.starred ? 'active' : ''}`}
          >
            {parsed.starred ? <IconStarFilled size={18} /> : <IconStar size={18} />}
          </button>
        )}
        <button
          onClick={(e) => onDelete(parsed.id, e)}
          className="custom-task-delete-btn"
        >
          <IconTrash size={16} />
        </button>
      </div>
    </div>
  );
}

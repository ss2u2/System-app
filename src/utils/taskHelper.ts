import type { Task, SubTask } from '../types';

export const getLocalDateString = (d: Date = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatTaskDate = (dateStr: string) => {
  if (!dateStr) return '';
  const today = getLocalDateString();
  if (dateStr === today) return 'Today';
  
  const [year, month, day] = dateStr.split('-');
  const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
  return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const formatTaskTime = (timeStr: string) => {
  if (!timeStr) return '';
  const [hoursStr, minutesStr] = timeStr.split(':');
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = String(minutes).padStart(2, '0');
  return `${displayHours}:${displayMinutes} ${ampm}`;
};

export const getRelativeTimeString = (timestamp: number) => {
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

export const getNextOccurrenceDate = (
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

export interface ParsedTask {
  id: number;
  name: string;
  done: boolean;
  listId: number | string;
  starred: boolean;
  createdAt: number;
  date?: string;
  time?: string;
  repeatType: string;
  repeatValue: string;
  deadline?: string;
  details?: string;
  subtasks?: SubTask[];
}

export function parseTask(t: Task): ParsedTask {
  if (t.cat && t.cat.startsWith('list-item|')) {
    const parts = t.cat.split('|'); // list-item | listId | starred | createdAt | date | time | repeatType | repeatValue | deadline | details | subtasks
    
    let subtasks: SubTask[] = [];
    if (parts[10]) {
      try {
        subtasks = JSON.parse(decodeURIComponent(parts[10]));
      } catch (e) {
        console.error('Failed to parse subtasks from t.cat:', e);
      }
    }
    
    return {
      id: t.id,
      listId: isNaN(Number(parts[1])) ? parts[1] : Number(parts[1]),
      starred: parts[2] === 'true',
      createdAt: Number(parts[3] || t.id),
      date: parts[4] || undefined,
      time: parts[5] || undefined,
      repeatType: parts[6] || 'none',
      repeatValue: parts[7] || '',
      deadline: parts[8] || undefined,
      details: parts[9] ? decodeURIComponent(parts[9]) : undefined,
      subtasks,
      name: t.name,
      done: t.done
    };
  } else {
    return {
      id: t.id,
      listId: 'toady', // legacy Toady view tasks
      starred: false,
      createdAt: t.id,
      date: undefined,
      time: undefined,
      repeatType: 'none',
      repeatValue: '',
      deadline: undefined,
      details: undefined,
      subtasks: [],
      name: t.name,
      done: t.done
    };
  }
}

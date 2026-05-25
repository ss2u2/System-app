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

export const getNthWeekdayOfMonth = (year: number, month: number, weekday: number, occurrence: number): Date => {
  const firstDayOfMonth = new Date(year, month, 1);
  let firstDayOffset = weekday - firstDayOfMonth.getDay();
  if (firstDayOffset < 0) {
    firstDayOffset += 7;
  }
  let targetDay = 1 + firstDayOffset + (occurrence - 1) * 7;
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  if (targetDay > lastDayOfMonth) {
    targetDay -= 7;
  }
  return new Date(year, month, targetDay);
};

export const getWeekdayOccurrenceInfo = (dateObj: Date) => {
  const dayOfMonth = dateObj.getDate();
  const occurrence = Math.ceil(dayOfMonth / 7);
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weekdayName = weekdays[dateObj.getDay()];
  const ordinals = ['first', 'second', 'third', 'fourth', 'last'];
  const ordinal = ordinals[occurrence - 1] || 'last';
  return {
    occurrence,
    weekday: dateObj.getDay(),
    weekdayName,
    ordinal,
    labelText: `every ${ordinal} ${weekdayName}`
  };
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
        if (config.monthMode === 'weekday') {
          const weekday = config.weekday !== undefined ? config.weekday : baseDate.getDay();
          const occurrence = config.weekdayOccurrence !== undefined ? config.weekdayOccurrence : Math.ceil(baseDate.getDate() / 7);
          const resolvedDate = getNthWeekdayOfMonth(nextDate.getFullYear(), nextDate.getMonth(), weekday, occurrence);
          nextDate.setTime(resolvedDate.getTime());
        } else {
          const dayOfMonth = config.dayOfMonth !== undefined ? config.dayOfMonth : baseDate.getDate();
          const lastDayOfTargetMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
          nextDate.setDate(Math.min(dayOfMonth, lastDayOfTargetMonth));
        }
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

export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const generateSecureNumericId = (): number => {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const array = new Uint32Array(2);
    crypto.getRandomValues(array);
    const high = array[0] & 0x1fffff; // 21 bits
    const low = array[1]; // 32 bits
    const id = (high * 0x100000000) + low;
    return id === 0 ? 1 : id;
  }
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER) + 1;
};

export interface ParsedTask {
  id: number | string;
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
  return {
    id: t.id,
    name: t.name,
    done: t.done,
    listId: t.listId || 'toady', // legacy Toady view tasks or daily items
    starred: t.starred || false,
    createdAt: t.createdAt || (typeof t.id === 'number' ? t.id : Date.now()),
    date: t.date || undefined,
    time: t.time || undefined,
    repeatType: t.repeatType || 'none',
    repeatValue: t.repeatValue || '',
    deadline: t.deadline || undefined,
    details: t.details || undefined,
    subtasks: t.subtasks || []
  };
}

export const formatRepeatValue = (repeatType: string, repeatValue: string, taskTime?: string): string => {
  if (repeatType === 'daily') {
    const timeSuffix = taskTime ? `, ${formatTaskTime(taskTime)}` : '';
    return `Daily${timeSuffix}`;
  }
  if (repeatType === 'custom' && repeatValue) {
    try {
      const config = JSON.parse(repeatValue);
      const every = Number(config.every) || 1;
      const unit = config.unit || 'week';
      
      let repeatStr = '';
      
      if (unit === 'day') {
        repeatStr = `Every ${every} day${every > 1 ? 's' : ''}`;
      } else if (unit === 'week') {
        const days: number[] = config.days || [];
        if (days.length === 0) {
          repeatStr = `Every ${every} week${every > 1 ? 's' : ''}`;
        } else {
          const weekdayNamesShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const dayNames = days.map(d => weekdayNamesShort[d]).join(', ');
          if (every === 1) {
            repeatStr = `Weekly on ${dayNames}`;
          } else {
            repeatStr = `Every ${every} weeks on ${dayNames}`;
          }
        }
      } else if (unit === 'month') {
        if (config.monthMode === 'weekday') {
          const weekdayNamesLong = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const ordinals = ['first', 'second', 'third', 'fourth', 'last'];
          const weekday = config.weekday !== undefined ? config.weekday : 4;
          const occurrence = config.weekdayOccurrence !== undefined ? config.weekdayOccurrence : 4;
          const weekdayText = weekdayNamesLong[weekday];
          const ordinalText = ordinals[occurrence - 1] || 'last';
          
          if (every === 1) {
            repeatStr = `Monthly (on every ${ordinalText} ${weekdayText})`;
          } else {
            repeatStr = `Every ${every} months (on every ${ordinalText} ${weekdayText})`;
          }
        } else {
          const dayOfMonth = config.dayOfMonth !== undefined ? config.dayOfMonth : 28;
          if (every === 1) {
            repeatStr = `Monthly (on day ${dayOfMonth})`;
          } else {
            repeatStr = `Every ${every} months (on day ${dayOfMonth})`;
          }
        }
      } else if (unit === 'year') {
        repeatStr = `Every ${every} year${every > 1 ? 's' : ''}`;
      }
      
      const timeVal = config.time || taskTime;
      if (timeVal) {
        repeatStr += `, ${formatTaskTime(timeVal)}`;
      }
      return repeatStr;
    } catch (e) {
      return 'Custom';
    }
  }
  return '';
};

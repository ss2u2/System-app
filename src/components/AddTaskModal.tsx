import React, { useState, useEffect, useRef } from 'react';
import * as chrono from 'chrono-node';
import {
  IconStar,
  IconStarFilled,
  IconClock,
  IconCalendar,
  IconRepeat,
  IconX,
  IconChevronDown,
  IconFolder
} from '@tabler/icons-react';
import { store } from '../services/db';
import { formatTaskDate, formatTaskTime, formatRepeatValue, getNthWeekdayOfMonth, getLocalDateString, getNextOccurrenceDate } from '../utils/taskHelper';
import CalendarPickerModal from './CalendarPickerModal';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialListId?: number | string;
  initialStarred?: boolean;
  onSave: (taskData: {
    name: string;
    details: string;
    listId: number | string;
    starred: boolean;
    date: string;
    time: string;
    repeatType: 'none' | 'daily' | 'custom';
    repeatValue: string;
    deadline: string;
  }) => void;
}

interface ParsedNLP {
  date: string;
  time: string;
  repeatType: 'none' | 'daily' | 'custom';
  repeatValue: string;
  highlights: { start: number; end: number; type: 'date' | 'time' | 'repeat'; text: string }[];
}

function parseWeekdaysList(text: string): number[] {
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const daysOfWeekShort = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const results: number[] = [];
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('weekday')) {
    return [1, 2, 3, 4, 5];
  }
  if (lowerText.includes('weekend')) {
    return [0, 6];
  }
  
  for (let i = 0; i < 7; i++) {
    const dayName = daysOfWeek[i];
    const dayShort = daysOfWeekShort[i];
    const regex = new RegExp(`\\b(${dayName}|${dayShort})\\b`, 'i');
    if (regex.test(lowerText)) {
      results.push(i);
    }
  }
  return results;
}

// NLP date, time, and custom recurrence parser
function parseTaskNLP(text: string): ParsedNLP {
  const result: ParsedNLP = {
    date: '',
    time: '',
    repeatType: 'none',
    repeatValue: '',
    highlights: [],
  };

  if (!text.trim()) return result;

  const today = new Date();
  let cleanText = text;

  // 1. Parse custom recurrence duration: "for N years/months/weeks/days"
  const durationRegex = /\bfor\s+(\d+|a|an|one)\s+(day|week|month|year)s?\b/gi;
  let durationMatch = null;
  const dMatch = durationRegex.exec(text);
  if (dMatch) {
    durationMatch = {
      text: dMatch[0],
      index: dMatch.index,
      value: dMatch[1],
      unit: dMatch[2].toLowerCase()
    };
    cleanText = cleanText.substring(0, dMatch.index) + ' '.repeat(dMatch[0].length) + cleanText.substring(dMatch.index + dMatch[0].length);
  }

  // 1.5 Parse relative monthly recurrence: e.g. "every month on second saturday", "on every last saturday monthly", "last saturday of every month"
  const relativeMonthlyRegex = /\b(?:every|each)\s+month\s+(?:on\s+)?(?:the\s+)?(first|second|third|fourth|fifth|last|1st|2nd|3rd|4th|5th|1|2|3|4|5)\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|wed|thu|fri|sat)\b|\b(?:on\s+)?(?:every|each\s+)?(first|second|third|fourth|fifth|last|1st|2nd|3rd|4th|5th|1|2|3|4|5)\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|wed|thu|fri|sat)\s+monthly\b|\b(?:on\s+)?(?:every|each\s+)?(first|second|third|fourth|fifth|last|1st|2nd|3rd|4th|5th|1|2|3|4|5)\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|wed|thu|fri|sat)\s+(?:of\s+)?(?:every|each)\s+month\b/gi;
  
  const ordinalMap: { [key: string]: number } = {
    first: 1, '1st': 1, '1': 1,
    second: 2, '2nd': 2, '2': 2,
    third: 3, '3rd': 3, '3': 3,
    fourth: 4, '4th': 4, '4': 4,
    fifth: 5, '5th': 5, '5': 5,
    last: 5
  };

  const weekdayMap: { [key: string]: number } = {
    sunday: 0, sun: 0,
    monday: 1, mon: 1,
    tuesday: 2, tue: 2,
    wednesday: 3, wed: 3,
    thursday: 4, thu: 4,
    friday: 5, fri: 5,
    saturday: 6, sat: 6
  };

  let relativeMonthlyMatch = null;
  const rmMatch = relativeMonthlyRegex.exec(cleanText);
  if (rmMatch) {
    const ordinal = (rmMatch[1] || rmMatch[3] || rmMatch[5] || '').toLowerCase();
    const weekdayName = (rmMatch[2] || rmMatch[4] || rmMatch[6] || '').toLowerCase();
    relativeMonthlyMatch = {
      text: rmMatch[0],
      index: rmMatch.index,
      ordinal,
      weekdayName
    };
    cleanText = cleanText.substring(0, rmMatch.index) + ' '.repeat(rmMatch[0].length) + cleanText.substring(rmMatch.index + rmMatch[0].length);
  }

  // 2. Parse monthly recurrence: e.g. "on 21st of every month", "on 25th every month", "on 21th monthly", "5th every month"
  const monthlyRegex = /\b(?:on\s+)?(?:the\s+)?(\d+)(?:st|nd|rd|th)?\s+(?:of\s+)?(?:every|each)\s+month\b|\b(?:on\s+)?(?:the\s+)?(\d+)(?:st|nd|rd|th)?\s+monthly\b|\b(?:every|each)\s+month\s+(?:on\s+)?(?:the\s+)?(\d+)(?:st|nd|rd|th)?\b/gi;
  let monthlyMatch = null;
  const mMatch = monthlyRegex.exec(cleanText);
  if (mMatch) {
    const dayStr = mMatch[1] || mMatch[2] || mMatch[3];
    monthlyMatch = {
      text: mMatch[0],
      index: mMatch.index,
      dayOfMonth: parseInt(dayStr, 10)
    };
    cleanText = cleanText.substring(0, mMatch.index) + ' '.repeat(mMatch[0].length) + cleanText.substring(mMatch.index + mMatch[0].length);
  }

  // 3. Parse weekdays repeat list: e.g. "every monday, thursday and saturday"
  const weekdayListRegex = /\b(?:every|each)\s+((?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun|weekday|weekend)(?:\s*(?:,|\band\b)\s*(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun|weekday|weekend))*)/gi;
  let weekdaysMatch = null;
  const wMatch = weekdayListRegex.exec(cleanText);
  if (wMatch) {
    weekdaysMatch = {
      text: wMatch[0],
      index: wMatch.index,
      listText: wMatch[1]
    };
    cleanText = cleanText.substring(0, wMatch.index) + ' '.repeat(wMatch[0].length) + cleanText.substring(wMatch.index + wMatch[0].length);
  }

  // 4. Parse standard recurrence (if neither monthly nor weekdays list matched)
  let repeatMatch = null;
  if (!monthlyMatch && !weekdaysMatch && !relativeMonthlyMatch) {
    const repeatRegex = /\b(?:every|each)\s+(?:day|week|month|year|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b|\bdaily\b|\bweekly\b|\bmonthly\b|\byearly\b/gi;
    const rMatch = repeatRegex.exec(cleanText);
    if (rMatch) {
      repeatMatch = {
        text: rMatch[0],
        index: rMatch.index
      };
      cleanText = cleanText.substring(0, rMatch.index) + ' '.repeat(rMatch[0].length) + cleanText.substring(rMatch.index + rMatch[0].length);
    }
  }

  // 5. Chrono-node date/time parsing on cleanText
  const parsedDates = chrono.parse(cleanText, today);
  
  parsedDates.forEach(match => {
    const hasDate = match.start.isCertain('day') || match.start.isCertain('month') || match.start.isCertain('weekday');
    const hasTime = match.start.isCertain('hour') || match.start.isCertain('minute');
    const dateObj = match.start.date();

    if (hasDate) {
      result.date = getLocalDateString(dateObj);
    }

    if (hasTime) {
      const hours = String(dateObj.getHours()).padStart(2, '0');
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');
      result.time = `${hours}:${minutes}`;
    }

    result.highlights.push({
      start: match.index,
      end: match.index + match.text.length,
      type: hasTime && !hasDate ? 'time' : 'date',
      text: text.substring(match.index, match.index + match.text.length),
    });
  });

  // Calculate repeat configurations
  if (monthlyMatch) {
    result.highlights.push({
      start: monthlyMatch.index,
      end: monthlyMatch.index + monthlyMatch.text.length,
      type: 'repeat',
      text: monthlyMatch.text,
    });
    result.repeatType = 'custom';
    const dayVal = monthlyMatch.dayOfMonth;
    
    if (!result.date) {
      const currentDay = today.getDate();
      const nextOccurrence = new Date(today);
      if (currentDay > dayVal) {
        nextOccurrence.setMonth(today.getMonth() + 1);
      }
      const lastDayOfTargetMonth = new Date(nextOccurrence.getFullYear(), nextOccurrence.getMonth() + 1, 0).getDate();
      nextOccurrence.setDate(Math.min(dayVal, lastDayOfTargetMonth));
      
      result.date = getLocalDateString(nextOccurrence);
    }

    // Process duration if present
    let ends = 'never';
    let endsOn = '';
    if (durationMatch) {
      ends = 'on';
      const baseDate = result.date ? new Date(result.date + 'T00:00:00') : today;
      let num = 1;
      if (durationMatch.value.match(/^\d+$/)) {
        num = parseInt(durationMatch.value, 10);
      } else if (durationMatch.value === 'one') {
        num = 1;
      }
      const endDate = new Date(baseDate);
      if (durationMatch.unit === 'year') {
        endDate.setFullYear(endDate.getFullYear() + num);
      } else if (durationMatch.unit === 'month') {
        endDate.setMonth(endDate.getMonth() + num);
      } else if (durationMatch.unit === 'week') {
        endDate.setDate(endDate.getDate() + num * 7);
      } else if (durationMatch.unit === 'day') {
        endDate.setDate(endDate.getDate() + num);
      }
      endsOn = getLocalDateString(endDate);
    }

    result.repeatValue = JSON.stringify({
      every: 1,
      unit: 'month',
      monthMode: 'day',
      dayOfMonth: dayVal,
      ends,
      endsOn,
      endsAfter: 13
    });
  } else if (relativeMonthlyMatch) {
    result.highlights.push({
      start: relativeMonthlyMatch.index,
      end: relativeMonthlyMatch.index + relativeMonthlyMatch.text.length,
      type: 'repeat',
      text: relativeMonthlyMatch.text,
    });
    result.repeatType = 'custom';
    
    const occurrence = ordinalMap[relativeMonthlyMatch.ordinal] || 1;
    const weekday = weekdayMap[relativeMonthlyMatch.weekdayName] !== undefined ? weekdayMap[relativeMonthlyMatch.weekdayName] : 1;
    
    if (!result.date) {
      let targetDate = getNthWeekdayOfMonth(today.getFullYear(), today.getMonth(), weekday, occurrence);
      const todayStr = getLocalDateString(today);
      const targetDateStr = getLocalDateString(targetDate);
      
      if (targetDateStr < todayStr) {
        const nextMonth = new Date(today);
        nextMonth.setMonth(today.getMonth() + 1);
        targetDate = getNthWeekdayOfMonth(nextMonth.getFullYear(), nextMonth.getMonth(), weekday, occurrence);
      }
      
      result.date = getLocalDateString(targetDate);
    }

    let ends = 'never';
    let endsOn = '';
    if (durationMatch) {
      ends = 'on';
      const baseDate = result.date ? new Date(result.date + 'T00:00:00') : today;
      let num = 1;
      if (durationMatch.value.match(/^\d+$/)) {
        num = parseInt(durationMatch.value, 10);
      } else if (durationMatch.value === 'one') {
        num = 1;
      }
      const endDate = new Date(baseDate);
      if (durationMatch.unit === 'year') {
        endDate.setFullYear(endDate.getFullYear() + num);
      } else if (durationMatch.unit === 'month') {
        endDate.setMonth(endDate.getMonth() + num);
      } else if (durationMatch.unit === 'week') {
        endDate.setDate(endDate.getDate() + num * 7);
      } else if (durationMatch.unit === 'day') {
        endDate.setDate(endDate.getDate() + num);
      }
      endsOn = getLocalDateString(endDate);
    }

    result.repeatValue = JSON.stringify({
      every: 1,
      unit: 'month',
      monthMode: 'weekday',
      weekday,
      weekdayOccurrence: occurrence,
      ends,
      endsOn,
      endsAfter: 13
    });
  } else if (weekdaysMatch) {
    result.highlights.push({
      start: weekdaysMatch.index,
      end: weekdaysMatch.index + weekdaysMatch.text.length,
      type: 'repeat',
      text: weekdaysMatch.text,
    });
    
    const days = parseWeekdaysList(weekdaysMatch.listText);
    result.repeatType = 'custom';
    
    if (!result.date && days.length > 0) {
      const sortedDays = [...days].sort((a, b) => a - b);
      const currentDayOfWeek = today.getDay();
      let targetDayOfWeek = -1;
      for (const d of sortedDays) {
        if (d >= currentDayOfWeek) {
          targetDayOfWeek = d;
          break;
        }
      }
      if (targetDayOfWeek === -1) {
        targetDayOfWeek = sortedDays[0];
      }
      let diff = targetDayOfWeek - currentDayOfWeek;
      if (diff < 0) {
        diff += 7;
      }
      const nextOccurrence = new Date(today);
      nextOccurrence.setDate(today.getDate() + diff);
      result.date = getLocalDateString(nextOccurrence);
    }

    // Process duration if present
    let ends = 'never';
    let endsOn = '';
    if (durationMatch) {
      ends = 'on';
      const baseDate = result.date ? new Date(result.date + 'T00:00:00') : today;
      let num = 1;
      if (durationMatch.value.match(/^\d+$/)) {
        num = parseInt(durationMatch.value, 10);
      } else if (durationMatch.value === 'one') {
        num = 1;
      }
      const endDate = new Date(baseDate);
      if (durationMatch.unit === 'year') {
        endDate.setFullYear(endDate.getFullYear() + num);
      } else if (durationMatch.unit === 'month') {
        endDate.setMonth(endDate.getMonth() + num);
      } else if (durationMatch.unit === 'week') {
        endDate.setDate(endDate.getDate() + num * 7);
      } else if (durationMatch.unit === 'day') {
        endDate.setDate(endDate.getDate() + num);
      }
      endsOn = getLocalDateString(endDate);
    }

    result.repeatValue = JSON.stringify({
      every: 1,
      unit: 'week',
      days,
      ends,
      endsOn,
      endsAfter: 13
    });
  } else if (repeatMatch) {
    const matchText = repeatMatch.text.toLowerCase();
    result.highlights.push({
      start: repeatMatch.index,
      end: repeatMatch.index + repeatMatch.text.length,
      type: 'repeat',
      text: repeatMatch.text,
    });

    let every = 1;
    let unit = 'week';
    let days: number[] = [];

    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const daysOfWeekShort = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    
    let foundDayIndex = -1;
    for (let i = 0; i < 7; i++) {
      const dayName = daysOfWeek[i];
      const dayShort = daysOfWeekShort[i];
      const dayRegex = new RegExp(`\\b(${dayName}|${dayShort})\\b`, 'i');
      if (dayRegex.test(matchText)) {
        foundDayIndex = i;
        break;
      }
    }

    if (foundDayIndex !== -1) {
      result.repeatType = 'custom';
      unit = 'week';
      days = [foundDayIndex];

      if (!result.date) {
        const startNum = today.getDay();
        let diff = foundDayIndex - startNum;
        if (diff < 0) {
          diff += 7;
        }
        const nextOccurrence = new Date(today);
        nextOccurrence.setDate(today.getDate() + diff);
        result.date = getLocalDateString(nextOccurrence);
      }
    } else if (matchText.includes('day') || matchText === 'daily') {
      result.repeatType = 'daily';
      unit = 'day';
    } else if (matchText.includes('week') || matchText === 'weekly') {
      result.repeatType = 'custom';
      unit = 'week';
    } else if (matchText.includes('month') || matchText === 'monthly') {
      result.repeatType = 'custom';
      unit = 'month';
    } else if (matchText.includes('year') || matchText === 'yearly') {
      result.repeatType = 'custom';
      unit = 'year';
    }

    // Process duration if present
    let ends = 'never';
    let endsOn = '';
    if (durationMatch) {
      ends = 'on';
      const baseDate = result.date ? new Date(result.date + 'T00:00:00') : today;
      let num = 1;
      if (durationMatch.value.match(/^\d+$/)) {
        num = parseInt(durationMatch.value, 10);
      } else if (durationMatch.value === 'one') {
        num = 1;
      }
      const endDate = new Date(baseDate);
      if (durationMatch.unit === 'year') {
        endDate.setFullYear(endDate.getFullYear() + num);
      } else if (durationMatch.unit === 'month') {
        endDate.setMonth(endDate.getMonth() + num);
      } else if (durationMatch.unit === 'week') {
        endDate.setDate(endDate.getDate() + num * 7);
      } else if (durationMatch.unit === 'day') {
        endDate.setDate(endDate.getDate() + num);
      }
      endsOn = getLocalDateString(endDate);
    }

    if (result.repeatType === 'custom' || days.length > 0) {
      result.repeatType = 'custom';
      result.repeatValue = JSON.stringify({
        every,
        unit,
        days,
        ends,
        endsOn,
        endsAfter: 13
      });
    }
  }

  // Add the duration highlight back if we matched it
  if (durationMatch) {
    result.highlights.push({
      start: durationMatch.index,
      end: durationMatch.index + durationMatch.text.length,
      type: 'repeat',
      text: durationMatch.text
    });
  }

  // Roll date forward if in the past
  const todayStr = getLocalDateString(today);
  if (result.date && result.date < todayStr) {
    if (result.repeatType !== 'none') {
      let current = result.date;
      for (let i = 0; i < 100; i++) {
        const next = getNextOccurrenceDate(current, result.repeatType, result.repeatValue);
        if (!next || next === current || next < todayStr) {
          if (next && next > current) {
            current = next;
            continue;
          }
          break;
        }
        current = next;
        if (current >= todayStr) {
          break;
        }
      }
      result.date = current;
    } else {
      const queryLower = text.toLowerCase();
      const hasWeekdayInQuery = /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|wed|thu|fri|sat)\b/i.test(queryLower);
      const hasMonthInQuery = /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\b/i.test(queryLower);
      const hasDayInQuery = /\b\d+(?:st|nd|rd|th)?\b/i.test(queryLower);

      let tempDate = new Date(result.date + 'T00:00:00');
      if (hasWeekdayInQuery) {
        while (getLocalDateString(tempDate) < todayStr) {
          tempDate.setDate(tempDate.getDate() + 7);
        }
        result.date = getLocalDateString(tempDate);
      } else if (hasMonthInQuery) {
        while (getLocalDateString(tempDate) < todayStr) {
          tempDate.setFullYear(tempDate.getFullYear() + 1);
        }
        result.date = getLocalDateString(tempDate);
      } else if (hasDayInQuery) {
        const originalDay = tempDate.getDate();
        while (getLocalDateString(tempDate) < todayStr) {
          tempDate.setMonth(tempDate.getMonth() + 1);
          const lastDayOfTargetMonth = new Date(tempDate.getFullYear(), tempDate.getMonth() + 1, 0).getDate();
          tempDate.setDate(Math.min(originalDay, lastDayOfTargetMonth));
        }
        result.date = getLocalDateString(tempDate);
      } else {
        while (getLocalDateString(tempDate) < todayStr) {
          tempDate.setDate(tempDate.getDate() + 1);
        }
        result.date = getLocalDateString(tempDate);
      }
    }
  }

  result.highlights.sort((a, b) => a.start - b.start);
  return result;
}

export default function AddTaskModal({
  isOpen,
  onClose,
  initialListId,
  initialStarred,
  onSave,
}: AddTaskModalProps) {
  const [taskName, setTaskName] = useState('');
  const [taskDetails, setTaskDetails] = useState('');
  
  // Date, Time, Deadline & Recurrence States
  const [taskDate, setTaskDate] = useState('');
  const [taskTime, setTaskTime] = useState('');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [repeatType, setRepeatType] = useState<'none' | 'daily' | 'custom'>('none');
  const [repeatValue, setRepeatValue] = useState('');

  // Star and destination list
  const [starred, setStarred] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string | number>(1001);

  // Sub-modal toggle states
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isListDropdownOpen, setIsListDropdownOpen] = useState(false);

  // Keep track of manual edits so NLP doesn't override user choices
  const [isManuallyEdited, setIsManuallyEdited] = useState({
    date: false,
    time: false,
    repeat: false,
  });

  const listDropdownRef = useRef<HTMLDivElement>(null);
  const underlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const allLists = store.getState().lists || [];

  // Reset fields on modal open/close
  useEffect(() => {
    if (isOpen) {
      setTaskName('');
      setTaskDetails('');
      
      let defaultListId = initialListId || 1001;
      let startStarred = initialStarred || false;
      
      if (initialListId === 'starred') {
        defaultListId = 1001;
        startStarred = true;
      }
      
      setSelectedListId(defaultListId);
      setStarred(startStarred);
      setTaskDate('');
      setTaskTime('');
      setTaskDeadline('');
      setRepeatType('none');
      setRepeatValue('');
      setIsManuallyEdited({ date: false, time: false, repeat: false });
      setIsCalendarOpen(false);
      setIsListDropdownOpen(false);
      
      // Auto focus title input
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
    }
  }, [isOpen, initialListId, initialStarred]);

  // Handle click outside list selector dropdown
  useEffect(() => {
    const clickHandler = (e: MouseEvent) => {
      if (listDropdownRef.current && !listDropdownRef.current.contains(e.target as Node)) {
        setIsListDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', clickHandler);
    return () => document.removeEventListener('mousedown', clickHandler);
  }, []);

  // Dynamically parse text while typing (NLP)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTaskName(val);

    if (!val.trim()) {
      setTaskDate('');
      setTaskTime('');
      setRepeatType('none');
      setRepeatValue('');
      setIsManuallyEdited({ date: false, time: false, repeat: false });
      return;
    }

    const parsed = parseTaskNLP(val);

    if (!isManuallyEdited.date) {
      setTaskDate(parsed.date);
    }
    if (!isManuallyEdited.time) {
      setTaskTime(parsed.time);
    }
    if (!isManuallyEdited.repeat) {
      setRepeatType(parsed.repeatType);
      setRepeatValue(parsed.repeatValue);
    }
  };

  const handleInputScroll = () => {
    if (inputRef.current && underlayRef.current) {
      underlayRef.current.scrollLeft = inputRef.current.scrollLeft;
    }
  };

  const selectedListName = (() => {
    if (selectedListId === 'toady') return 'Today';
    const match = allLists.find(l => String(l.id) === String(selectedListId));
    return match ? match.name : 'Inbox';
  })();

  const getUnderlayContent = () => {
    if (!taskName) return '';
    const parsed = parseTaskNLP(taskName);
    const highlights = parsed.highlights;

    if (highlights.length === 0) return taskName;

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    highlights.forEach((h, idx) => {
      if (h.start > lastIndex) {
        elements.push(taskName.substring(lastIndex, h.start));
      }
      elements.push(
        <span key={`hl-${idx}`} className={`nlp-highlight-token ${h.type}`}>
          {taskName.substring(h.start, h.end)}
        </span>
      );
      lastIndex = h.end;
    });

    if (lastIndex < taskName.length) {
      elements.push(taskName.substring(lastIndex));
    }

    return elements;
  };

  // Submit form
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) return;

    let cleanedName = taskName.trim();
    const parsed = parseTaskNLP(taskName);
    
    // Slice out parsed date/time tokens from task title
    const sortedHighlights = [...parsed.highlights].sort((a, b) => b.start - a.start);
    sortedHighlights.forEach(h => {
      cleanedName = cleanedName.substring(0, h.start) + cleanedName.substring(h.end);
    });
    
    cleanedName = cleanedName
      .replace(/\s+/g, ' ')
      .replace(/\b(at|on|for|by|every|each|in)\b\s*$/gi, '')
      .trim();

    if (!cleanedName) {
      cleanedName = taskName.trim();
    }

    onSave({
      name: cleanedName,
      details: taskDetails.trim(),
      listId: selectedListId,
      starred,
      date: taskDate,
      time: taskTime,
      repeatType,
      repeatValue,
      deadline: taskDeadline,
    });

    onClose();
  };

  const getRepeatDisplay = () => {
    return formatRepeatValue(repeatType, repeatValue, taskTime);
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="task-modal-overlay open"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="task-modal-content">
          <div className="task-modal-drag-handle" />
          
          <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div className="task-modal-body">
              {/* Task Title with live underlay highlights */}
              <div className="nlp-input-wrapper">
                <div ref={underlayRef} className="nlp-input-underlay">
                  {getUnderlayContent()}
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  className="nlp-input-textarea"
                  placeholder="New task"
                  value={taskName}
                  onChange={handleInputChange}
                  onScroll={handleInputScroll}
                  required
                  autoComplete="off"
                />
              </div>

              {/* Task Description */}
              <textarea
                className="nlp-desc-textarea"
                placeholder="Description"
                value={taskDetails}
                onChange={(e) => setTaskDetails(e.target.value)}
                rows={2}
              />

              {/* Dynamic Chips (Active scheduling configuration) */}
              <div className="nlp-chips-container">
                {taskDate && (
                  <div className="nlp-chip date" onClick={() => setIsCalendarOpen(true)}>
                    <IconCalendar size={14} />
                    <span>{formatTaskDate(taskDate)}</span>
                    <button
                      type="button"
                      className="nlp-chip-remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTaskDate('');
                        setIsManuallyEdited(prev => ({ ...prev, date: true }));
                      }}
                    >
                      <IconX size={12} />
                    </button>
                  </div>
                )}
                
                {taskTime && (
                  <div className="nlp-chip time" onClick={() => setIsCalendarOpen(true)}>
                    <IconClock size={14} />
                    <span>{formatTaskTime(taskTime)}</span>
                    <button
                      type="button"
                      className="nlp-chip-remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTaskTime('');
                        setIsManuallyEdited(prev => ({ ...prev, time: true }));
                      }}
                    >
                      <IconX size={12} />
                    </button>
                  </div>
                )}

                {taskDeadline && (
                  <div className="nlp-chip date" style={{ borderStyle: 'dashed', borderColor: 'var(--red)' }} onClick={() => setIsCalendarOpen(true)}>
                    <IconCalendar size={14} style={{ color: 'var(--red)' }} />
                    <span style={{ color: 'var(--red)' }}>Due {formatTaskDate(taskDeadline)}</span>
                    <button
                      type="button"
                      className="nlp-chip-remove"
                      style={{ color: 'var(--red)' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setTaskDeadline('');
                      }}
                    >
                      <IconX size={12} />
                    </button>
                  </div>
                )}

                {repeatType !== 'none' && (
                  <div className="nlp-chip repeat" onClick={() => setIsCalendarOpen(true)}>
                    <IconRepeat size={14} />
                    <span>{getRepeatDisplay()}</span>
                    <button
                      type="button"
                      className="nlp-chip-remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRepeatType('none');
                        setRepeatValue('');
                        setIsManuallyEdited(prev => ({ ...prev, repeat: true }));
                      }}
                    >
                      <IconX size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Toolbar */}
            <div className="task-modal-toolbar">
              <div className="task-modal-toolbar-left">
                {/* 1. Folder List Selector */}
                <div ref={listDropdownRef} className="list-selector-dropdown-container">
                  <button
                    type="button"
                    className="list-selector-btn"
                    onClick={() => setIsListDropdownOpen(prev => !prev)}
                  >
                    <IconFolder size={15} />
                    <span>{selectedListName}</span>
                    <IconChevronDown size={12} />
                  </button>

                  {isListDropdownOpen && (
                    <div className="list-selector-menu">
                      <button
                        type="button"
                        className={`list-selector-item ${selectedListId === 'toady' ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedListId('toady');
                          setIsListDropdownOpen(false);
                        }}
                      >
                        Today
                      </button>
                      {allLists.map((list) => (
                        <button
                          key={list.id}
                          type="button"
                          className={`list-selector-item ${String(selectedListId) === String(list.id) ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedListId(list.id);
                            setIsListDropdownOpen(false);
                          }}
                        >
                          {list.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Custom Calendar Trigger Button */}
                <button
                  type="button"
                  className={`toolbar-action-btn ${isCalendarOpen ? 'active' : ''}`}
                  onClick={() => setIsCalendarOpen(true)}
                  title="Open calendar scheduler"
                >
                  <IconClock size={18} />
                </button>

                {/* 3. Star Toggle Button */}
                <button
                  type="button"
                  className={`toolbar-action-btn ${starred ? 'active' : ''}`}
                  onClick={() => setStarred(prev => !prev)}
                  title="Toggle star"
                >
                  {starred ? <IconStarFilled size={18} /> : <IconStar size={18} />}
                </button>
              </div>

              <div className="task-modal-toolbar-right">
                <button
                  type="submit"
                  className="btn-save"
                  style={{
                    padding: '8px 20px',
                    borderRadius: 20,
                    fontWeight: 600,
                    width: 'auto',
                    flex: 'none',
                  }}
                  disabled={!taskName.trim()}
                >
                  Save
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Embedded Calendar Picker Modal */}
      <CalendarPickerModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        date={taskDate}
        time={taskTime}
        deadline={taskDeadline}
        repeatType={repeatType}
        repeatValue={repeatValue}
        onSave={(data) => {
          setTaskDate(data.date);
          setTaskTime(data.time);
          setTaskDeadline(data.deadline);
          setRepeatType(data.repeatType as any);
          setRepeatValue(data.repeatValue);
          setIsManuallyEdited({ date: true, time: true, repeat: true });
        }}
      />
    </>
  );
}

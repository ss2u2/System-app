import { useState, useEffect, useRef } from 'react';
import {
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconCalendar,
  IconRepeat,
  IconX
} from '@tabler/icons-react';
import { getLocalDateString, formatTaskDate, formatTaskTime, formatRepeatValue } from '../utils/taskHelper';

interface CalendarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;       // YYYY-MM-DD
  time: string;       // HH:MM
  deadline: string;   // YYYY-MM-DD
  repeatType: string; // 'none' | 'daily' | 'custom'
  repeatValue: string; // JSON string
  onSave: (data: {
    date: string;
    time: string;
    deadline: string;
    repeatType: string;
    repeatValue: string;
  }) => void;
  initialTab?: 'date' | 'deadline';
}

export default function CalendarPickerModal({
  isOpen,
  onClose,
  date,
  time,
  deadline,
  repeatType,
  repeatValue,
  onSave,
  initialTab = 'date'
}: CalendarPickerModalProps) {
  // Calendar Month Navigation
  const [navDate, setNavDate] = useState(() => {
    if (date) {
      const [y, m] = date.split('-');
      return new Date(Number(y), Number(m) - 1, 1);
    }
    return new Date();
  });

  // Picker States
  const [tempDate, setTempDate] = useState(date);
  const [tempTime, setTempTime] = useState(time);
  const [tempDeadline, setTempDeadline] = useState(deadline);
  const [tempRepeatType, setTempRepeatType] = useState(repeatType);
  const [tempRepeatValue, setTempRepeatValue] = useState(repeatValue);

  // Tab & Warning States
  const [activeTab, setActiveTab] = useState<'date' | 'deadline'>(initialTab);
  const [showDeadlineWarning, setShowDeadlineWarning] = useState(false);
  const timeInputRef = useRef<HTMLInputElement>(null);

  // Custom Recurrence Sub-Modal States
  const [isCustomRepeatOpen, setIsCustomRepeatOpen] = useState(false);
  const [customEvery, setCustomEvery] = useState(1);
  const [customUnit, setCustomUnit] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [customEnds, setCustomEnds] = useState<'never' | 'on' | 'after'>('never');
  const [customEndsOn, setCustomEndsOn] = useState('');
  const [customEndsAfter, setCustomEndsAfter] = useState(13);
  const [customTime, setCustomTime] = useState('');
  const [customMonthMode, setCustomMonthMode] = useState<'day' | 'weekday'>('day');
  const [customDayOfMonth, setCustomDayOfMonth] = useState(28);
  const [customWeekdayOccurrence, setCustomWeekdayOccurrence] = useState(4);
  const [customWeekday, setCustomWeekday] = useState(4);

  // Populate States on Open
  useEffect(() => {
    if (isOpen) {
      setTempDate(date);
      setTempTime(time);
      setTempDeadline(deadline);
      setTempRepeatType(repeatType === 'daily' ? 'custom' : repeatType);
      
      let initialVal = repeatValue;
      if (repeatType === 'daily' && !repeatValue) {
        initialVal = JSON.stringify({ every: 1, unit: 'day', ends: 'never' });
      }
      setTempRepeatValue(initialVal);
      setActiveTab(initialTab);
      setShowDeadlineWarning(false);

      // Set navigated month to initial selected date or current date
      if (date) {
        const [y, m] = date.split('-');
        setNavDate(new Date(Number(y), Number(m) - 1, 1));
      } else {
        setNavDate(new Date());
      }

      // Populate custom recurrence fields
      const baseDate = date ? new Date(date + 'T00:00:00') : new Date();
      const currentRepeatType = repeatType === 'daily' ? 'custom' : repeatType;
      const currentRepeatValue = initialVal;

      if (currentRepeatType === 'custom' && currentRepeatValue) {
        try {
          const config = JSON.parse(currentRepeatValue);
          setCustomEvery(config.every || 1);
          setCustomUnit(config.unit || 'week');
          setCustomDays(config.days || []);
          setCustomEnds(config.ends || 'never');
          setCustomEndsOn(config.endsOn || '');
          setCustomEndsAfter(config.endsAfter || 13);
          setCustomTime(config.time || time || '');
          setCustomMonthMode(config.monthMode || 'day');
          setCustomDayOfMonth(config.dayOfMonth || baseDate.getDate());
          setCustomWeekday(config.weekday !== undefined ? config.weekday : baseDate.getDay());
          setCustomWeekdayOccurrence(config.weekdayOccurrence || Math.ceil(baseDate.getDate() / 7));
        } catch (err) {
          console.error(err);
        }
      } else {
        setCustomEvery(1);
        setCustomUnit('week');
        setCustomDays([]);
        setCustomEnds('never');
        setCustomEndsOn('');
        setCustomEndsAfter(13);
        setCustomTime(time || '');
        setCustomMonthMode('day');
        setCustomDayOfMonth(baseDate.getDate());
        setCustomWeekday(baseDate.getDay());
        setCustomWeekdayOccurrence(Math.ceil(baseDate.getDate() / 7));
      }
    }
  }, [isOpen, date, time, deadline, repeatType, repeatValue]);

  useEffect(() => {
    if (tempDate) {
      const baseDate = new Date(tempDate + 'T00:00:00');
      if (!isNaN(baseDate.getTime())) {
        setCustomDayOfMonth(baseDate.getDate());
        setCustomWeekday(baseDate.getDay());
        setCustomWeekdayOccurrence(Math.ceil(baseDate.getDate() / 7));
      }
    }
  }, [tempDate]);

  if (!isOpen) return null;

  const currentYear = navDate.getFullYear();
  const currentMonth = navDate.getMonth(); // 0-indexed

  // Month navigation handlers
  const handlePrevMonth = () => {
    setNavDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setNavDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Calendar Math: Generate grid cells
  const getDaysInMonth = () => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // Weekday of 1st day (0 = Sun, 6 = Sat)
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const cells: { dateStr: string; dayNum: number; isDifferentMonth: boolean }[] = [];

    // Fill previous month overlap cells
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevDay = daysInPrevMonth - i;
      const prevMonthDate = new Date(currentYear, currentMonth - 1, prevDay);
      cells.push({
        dateStr: getLocalDateString(prevMonthDate),
        dayNum: prevDay,
        isDifferentMonth: true,
      });
    }

    // Fill current month cells
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      const curDate = new Date(currentYear, currentMonth, i);
      cells.push({
        dateStr: getLocalDateString(curDate),
        dayNum: i,
        isDifferentMonth: false,
      });
    }

    // Fill next month overlap cells to complete grid (multiples of 7, usually 35 or 42 cells)
    const totalGridCells = cells.length <= 35 ? 35 : 42;
    const remainingCellsCount = totalGridCells - cells.length;
    for (let i = 1; i <= remainingCellsCount; i++) {
      const nextMonthDate = new Date(currentYear, currentMonth + 1, i);
      cells.push({
        dateStr: getLocalDateString(nextMonthDate),
        dayNum: i,
        isDifferentMonth: true,
      });
    }

    return cells;
  };

  const dayCells = getDaysInMonth();
  const monthName = navDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const todayStr = getLocalDateString();

  const handleCellClick = (cellDateStr: string) => {
    if (activeTab === 'deadline') {
      setTempDeadline(cellDateStr);
    } else {
      setTempDate(cellDateStr);
    }
  };

  const handleSave = () => {
    let finalTime = tempTime;
    let finalRepeatValue = tempRepeatValue;
    if (tempRepeatType === 'custom') {
      if (customTime) {
        finalTime = customTime;
      }
      
      let dayOfMonth: number | undefined = undefined;
      let weekday: number | undefined = undefined;
      let weekdayOccurrence: number | undefined = undefined;

      if (customUnit === 'month') {
        if (customMonthMode === 'day') {
          dayOfMonth = customDayOfMonth;
        } else {
          weekday = customWeekday;
          weekdayOccurrence = customWeekdayOccurrence;
        }
      }

      finalRepeatValue = JSON.stringify({
        every: customEvery,
        unit: customUnit,
        days: customUnit === 'week' ? customDays : [],
        ends: customEnds,
        endsOn: customEndsOn,
        endsAfter: customEndsAfter,
        time: customTime || undefined,
        monthMode: customUnit === 'month' ? customMonthMode : undefined,
        dayOfMonth: customUnit === 'month' && customMonthMode === 'day' ? dayOfMonth : undefined,
        weekday: customUnit === 'month' && customMonthMode === 'weekday' ? weekday : undefined,
        weekdayOccurrence: customUnit === 'month' && customMonthMode === 'weekday' ? weekdayOccurrence : undefined,
      });
    }

    if (tempDeadline && tempDate && tempDeadline < tempDate) {
      setShowDeadlineWarning(true);
      return;
    }

    onSave({
      date: tempDate,
      time: finalTime,
      deadline: tempDeadline,
      repeatType: tempRepeatType,
      repeatValue: finalRepeatValue,
    });
    onClose();
  };

  const getRepeatDisplayString = () => {
    if (tempRepeatType === 'custom') {
      const tempVal = JSON.stringify({
        every: customEvery,
        unit: customUnit,
        days: customUnit === 'week' ? customDays : [],
        ends: customEnds,
        endsOn: customEndsOn,
        endsAfter: customEndsAfter,
        time: customTime || undefined,
        monthMode: customUnit === 'month' ? customMonthMode : undefined,
        dayOfMonth: customUnit === 'month' && customMonthMode === 'day' ? customDayOfMonth : undefined,
        weekday: customUnit === 'month' && customMonthMode === 'weekday' ? customWeekday : undefined,
        weekdayOccurrence: customUnit === 'month' && customMonthMode === 'weekday' ? customWeekdayOccurrence : undefined,
      });
      return formatRepeatValue(tempRepeatType, tempVal, tempTime);
    }
    return formatRepeatValue(tempRepeatType, tempRepeatValue, tempTime);
  };

  return (
    <>
      <div className="calendar-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="calendar-picker-card">
          
          {/* Top selection tabs */}
          <div className="calendar-mode-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            <button 
              type="button" 
              className={`calendar-mode-btn ${activeTab === 'date' ? 'active' : ''}`}
              onClick={() => setActiveTab('date')}
              style={{
                flex: 1,
                padding: '12px',
                background: 'none',
                border: 'none',
                color: activeTab === 'date' ? 'var(--accent)' : 'var(--text3)',
                fontWeight: activeTab === 'date' ? 700 : 500,
                borderBottom: activeTab === 'date' ? '2px solid var(--accent)' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '14px'
              }}
            >
              Scheduled Date
            </button>
            <button 
              type="button" 
              className={`calendar-mode-btn ${activeTab === 'deadline' ? 'active' : ''}`}
              onClick={() => setActiveTab('deadline')}
              style={{
                flex: 1,
                padding: '12px',
                background: 'none',
                border: 'none',
                color: activeTab === 'deadline' ? 'var(--red)' : 'var(--text3)',
                fontWeight: activeTab === 'deadline' ? 700 : 500,
                borderBottom: activeTab === 'deadline' ? '2px solid var(--red)' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '14px'
              }}
            >
              Deadline
            </button>
          </div>

          <div className="calendar-picker-body">
            {/* Header: Month title & paging */}
            <div className="calendar-month-header">
              <button type="button" className="calendar-nav-btn" onClick={handlePrevMonth}>
                <IconChevronLeft size={18} />
              </button>
              <div className="calendar-month-title">{monthName}</div>
              <button type="button" className="calendar-nav-btn" onClick={handleNextMonth}>
                <IconChevronRight size={18} />
              </button>
            </div>

            {/* Weekday labels */}
            <div className="calendar-weekdays">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayChar, i) => (
                <div key={i} className="calendar-weekday">{dayChar}</div>
              ))}
            </div>

            {/* Grid of days */}
            <div className="calendar-grid">
              {dayCells.map((cell, idx) => {
                const isSelected = tempDate === cell.dateStr;
                const isDeadline = tempDeadline === cell.dateStr;
                const isToday = todayStr === cell.dateStr;

                return (
                  <button
                    key={idx}
                    type="button"
                    className={`calendar-day-cell ${cell.isDifferentMonth ? 'different-month' : ''} ${
                      isSelected ? 'selected' : ''
                    } ${isDeadline ? 'deadline-cell' : ''} ${isToday ? 'today-cell' : ''}`}
                    onClick={() => handleCellClick(cell.dateStr)}
                  >
                    {cell.dayNum}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="calendar-divider" style={{ margin: 0 }} />

          {/* Direct Option Trigger Rows */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            
            {/* 1. Set Time Option Row */}
            <div className="calendar-option-row" onClick={() => timeInputRef.current?.showPicker()} style={{ cursor: 'pointer' }}>
              <input
                ref={timeInputRef}
                type="time"
                value={tempTime}
                onChange={(e) => setTempTime(e.target.value)}
                style={{ display: 'none' }}
              />
              <div className="calendar-option-header">
                <div className="calendar-option-header-left">
                  <div className="calendar-option-icon">
                    <IconClock size={16} />
                  </div>
                  <span>Set time</span>
                </div>
                <div className="calendar-option-header-right" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {tempTime ? (
                    <>
                      <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{formatTaskTime(tempTime)}</span>
                      <button
                        type="button"
                        className="pill-clear-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTempTime('');
                        }}
                        style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4 }}
                      >
                        <IconX size={14} />
                      </button>
                    </>
                  ) : (
                    <span style={{ color: 'var(--text3)' }}>None</span>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Set Deadline Option Row */}
            <div 
              className="calendar-option-row" 
              onClick={() => setActiveTab('deadline')} 
              style={{ 
                cursor: 'pointer',
                backgroundColor: activeTab === 'deadline' ? 'var(--bg3)' : undefined,
                transition: 'background-color 0.2s'
              }}
            >
              <div className="calendar-option-header">
                <div className="calendar-option-header-left">
                  <div className="calendar-option-icon" style={{ color: activeTab === 'deadline' ? 'var(--red)' : undefined }}>
                    <IconCalendar size={16} />
                  </div>
                  <span style={{ fontWeight: activeTab === 'deadline' ? 600 : undefined, color: activeTab === 'deadline' ? 'var(--red)' : undefined }}>Set deadline</span>
                </div>
                <div className="calendar-option-header-right" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {tempDeadline ? (
                    <>
                      <span style={{ fontWeight: 600, color: 'var(--red)' }}>{formatTaskDate(tempDeadline)}</span>
                      <button
                        type="button"
                        className="pill-clear-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTempDeadline('');
                        }}
                        style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: 4 }}
                      >
                        <IconX size={14} />
                      </button>
                    </>
                  ) : (
                    <span style={{ color: 'var(--text3)' }}>Select on calendar</span>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Repeat Option Row */}
            <div 
              className="calendar-option-row" 
              onClick={() => setIsCustomRepeatOpen(true)} 
              style={{ cursor: 'pointer' }}
            >
              <div className="calendar-option-header">
                <div className="calendar-option-header-left">
                  <div className="calendar-option-icon">
                    <IconRepeat size={16} />
                  </div>
                  <span>Repeat</span>
                </div>
                <div className="calendar-option-header-right" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {tempRepeatType !== 'none' ? (
                    <>
                      <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{getRepeatDisplayString()}</span>
                      <button
                        type="button"
                        className="pill-clear-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTempRepeatType('none');
                          setTempRepeatValue('');
                        }}
                        style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4 }}
                      >
                        <IconX size={14} />
                      </button>
                    </>
                  ) : (
                    <span style={{ color: 'var(--text3)' }}>None</span>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="calendar-actions-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn-done" onClick={handleSave}>
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Recurrence config Sub-Modal */}
      {isCustomRepeatOpen && (
        <div
          className="modal-overlay open"
          style={{ zIndex: 12000 }}
          onClick={(e) => e.target === e.currentTarget && setIsCustomRepeatOpen(false)}
        >
          <div className="modal recurrence-modal" style={{ maxWidth: 360 }}>
            <div className="modal-title">Repeats every</div>
            
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
              <input
                type="number"
                min="1"
                value={customEvery}
                onChange={(e) => setCustomEvery(Math.max(1, parseInt(e.target.value, 10) || 1))}
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
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value as any)}
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--text2)' }}>Time</div>
              <input
                type="time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--bg3)',
                  color: 'var(--text)',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>

            {customUnit === 'month' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {/* 1. Day of Month Option */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="customMonthMode"
                    checked={customMonthMode === 'day'}
                    onChange={() => setCustomMonthMode('day')}
                    style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                  <select
                    disabled={customMonthMode !== 'day'}
                    value={customDayOfMonth}
                    onChange={(e) => setCustomDayOfMonth(parseInt(e.target.value, 10))}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: customMonthMode === 'day' ? 'var(--bg3)' : 'var(--bg)',
                      color: customMonthMode === 'day' ? 'var(--text)' : 'var(--text3)',
                      fontSize: 14,
                      outline: 'none',
                      opacity: customMonthMode === 'day' ? 1 : 0.6,
                      cursor: customMonthMode === 'day' ? 'pointer' : 'not-allowed',
                      fontFamily: 'inherit'
                    }}
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        Day {d}
                      </option>
                    ))}
                  </select>
                </label>

                {/* 2. Relative Weekday Option */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="customMonthMode"
                    checked={customMonthMode === 'weekday'}
                    onChange={() => setCustomMonthMode('weekday')}
                    style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                    <select
                      disabled={customMonthMode !== 'weekday'}
                      value={customWeekdayOccurrence}
                      onChange={(e) => setCustomWeekdayOccurrence(parseInt(e.target.value, 10))}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: customMonthMode === 'weekday' ? 'var(--bg3)' : 'var(--bg)',
                        color: customMonthMode === 'weekday' ? 'var(--text)' : 'var(--text3)',
                        fontSize: 14,
                        outline: 'none',
                        opacity: customMonthMode === 'weekday' ? 1 : 0.6,
                        cursor: customMonthMode === 'weekday' ? 'pointer' : 'not-allowed',
                        fontFamily: 'inherit'
                      }}
                    >
                      <option value={1}>First</option>
                      <option value={2}>Second</option>
                      <option value={3}>Third</option>
                      <option value={4}>Fourth</option>
                      <option value={5}>Last</option>
                    </select>

                    <select
                      disabled={customMonthMode !== 'weekday'}
                      value={customWeekday}
                      onChange={(e) => setCustomWeekday(parseInt(e.target.value, 10))}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: customMonthMode === 'weekday' ? 'var(--bg3)' : 'var(--bg)',
                        color: customMonthMode === 'weekday' ? 'var(--text)' : 'var(--text3)',
                        fontSize: 14,
                        outline: 'none',
                        opacity: customMonthMode === 'weekday' ? 1 : 0.6,
                        cursor: customMonthMode === 'weekday' ? 'pointer' : 'not-allowed',
                        fontFamily: 'inherit'
                      }}
                    >
                      <option value={0}>Sunday</option>
                      <option value={1}>Monday</option>
                      <option value={2}>Tuesday</option>
                      <option value={3}>Wednesday</option>
                      <option value={4}>Thursday</option>
                      <option value={5}>Friday</option>
                      <option value={6}>Saturday</option>
                    </select>
                  </div>
                </label>
              </div>
            )}

            {customUnit === 'week' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayChar, index) => {
                  const isSelected = customDays.includes(index);
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setCustomDays(customDays.filter(d => d !== index));
                        } else {
                          setCustomDays([...customDays, index]);
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
                  name="ends"
                  checked={customEnds === 'never'}
                  onChange={() => setCustomEnds('never')}
                  style={{ accentColor: 'var(--accent)' }}
                />
                <span>Never</span>
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, fontSize: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flexShrink: 0 }}>
                  <input
                    type="radio"
                    name="ends"
                    checked={customEnds === 'on'}
                    onChange={() => setCustomEnds('on')}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <span>On</span>
                </label>
                <input
                  type="date"
                  disabled={customEnds !== 'on'}
                  value={customEndsOn}
                  onChange={(e) => setCustomEndsOn(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: customEnds === 'on' ? 'var(--bg3)' : 'var(--bg)',
                    color: customEnds === 'on' ? 'var(--text)' : 'var(--text3)',
                    fontSize: 13,
                    outline: 'none',
                    opacity: customEnds === 'on' ? 1 : 0.6,
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flexShrink: 0 }}>
                  <input
                    type="radio"
                    name="ends"
                    checked={customEnds === 'after'}
                    onChange={() => setCustomEnds('after')}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <span>After</span>
                </label>
                <input
                  type="number"
                  min="1"
                  disabled={customEnds !== 'after'}
                  value={customEndsAfter}
                  onChange={(e) => setCustomEndsAfter(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  style={{
                    width: 70,
                    padding: '8px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: customEnds === 'after' ? 'var(--bg3)' : 'var(--bg)',
                    color: customEnds === 'after' ? 'var(--text)' : 'var(--text3)',
                    fontSize: 13,
                    textAlign: 'center',
                    outline: 'none',
                    opacity: customEnds === 'after' ? 1 : 0.6,
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
                  if (tempRepeatType !== 'custom') {
                    setTempRepeatType('none');
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
                  setTempRepeatType('custom');
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

      {/* Date validation conflict warning modal */}
      {showDeadlineWarning && (
        <div className="modal-overlay open" style={{ zIndex: 13000 }}>
          <div className="modal" style={{ width: 'auto', minWidth: '285px', maxWidth: '90vw' }}>
            <h3 className="modal-title" style={{ marginBottom: '12px', color: 'var(--red)', fontSize: '16px', fontWeight: 700 }}>
              Schedule the task after its deadline
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '24px', lineHeight: '1.4' }}>
              The deadline (the date user has selected) is before then the scheduled date (the date user has selected)
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button 
                type="button" 
                className="btn-save" 
                style={{ width: '100%', padding: '10px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '20px', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => {
                  setShowDeadlineWarning(false);
                  let finalTime = tempTime;
                  let finalRepeatValue = tempRepeatValue;
                  if (tempRepeatType === 'custom') {
                    if (customTime) {
                      finalTime = customTime;
                    }
                    let dayOfMonth: number | undefined = undefined;
                    let weekday: number | undefined = undefined;
                    let weekdayOccurrence: number | undefined = undefined;
                    if (customUnit === 'month') {
                      if (customMonthMode === 'day') {
                        dayOfMonth = customDayOfMonth;
                      } else {
                        weekday = customWeekday;
                        weekdayOccurrence = customWeekdayOccurrence;
                      }
                    }
                    finalRepeatValue = JSON.stringify({
                      every: customEvery,
                      unit: customUnit,
                      days: customUnit === 'week' ? customDays : [],
                      ends: customEnds,
                      endsOn: customEndsOn,
                      endsAfter: customEndsAfter,
                      time: customTime || undefined,
                      monthMode: customUnit === 'month' ? customMonthMode : undefined,
                      dayOfMonth: customUnit === 'month' && customMonthMode === 'day' ? dayOfMonth : undefined,
                      weekday: customUnit === 'month' && customMonthMode === 'weekday' ? weekday : undefined,
                      weekdayOccurrence: customUnit === 'month' && customMonthMode === 'weekday' ? weekdayOccurrence : undefined,
                    });
                  }
                  onSave({
                    date: tempDate,
                    time: finalTime,
                    deadline: tempDeadline,
                    repeatType: tempRepeatType,
                    repeatValue: finalRepeatValue,
                  });
                  onClose();
                }}
              >
                Schedule anyway
              </button>
              <button 
                type="button" 
                className="btn-cancel" 
                style={{ width: '100%', padding: '10px 16px', background: 'var(--bg3)', color: 'var(--text)', border: 'none', borderRadius: '20px', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => {
                  setShowDeadlineWarning(false);
                }}
              >
                edit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}



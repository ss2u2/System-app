import React, { useState, useEffect } from 'react';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onSave: (taskData: {
    name: string;
    date: string;
    time: string;
    repeatType: 'none' | 'daily' | 'custom';
    repeatValue: string;
  }) => void;
}

export default function AddTaskModal({
  isOpen,
  onClose,
  title,
  onSave,
}: AddTaskModalProps) {
  const [taskName, setTaskName] = useState('');
  const [taskDate, setTaskDate] = useState('');
  const [taskTime, setTaskTime] = useState('');
  const [repeatType, setRepeatType] = useState<'none' | 'daily' | 'custom'>('none');
  
  // Custom Repeat Config
  const [customEvery, setCustomEvery] = useState(1);
  const [customUnit, setCustomUnit] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [customDays, setCustomDays] = useState<number[]>([]); // 0: Sunday, 6: Saturday
  const [customEnds, setCustomEnds] = useState<'never' | 'on' | 'after'>('never');
  const [customEndsOn, setCustomEndsOn] = useState('');
  const [customEndsAfter, setCustomEndsAfter] = useState(13);

  // Temporary Recurrence Modal states
  const [isCustomRepeatOpen, setIsCustomRepeatOpen] = useState(false);
  const [tempEvery, setTempEvery] = useState(1);
  const [tempUnit, setTempUnit] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [tempDays, setTempDays] = useState<number[]>([]);
  const [tempEnds, setTempEnds] = useState<'never' | 'on' | 'after'>('never');
  const [tempEndsOn, setTempEndsOn] = useState('');
  const [tempEndsAfter, setTempEndsAfter] = useState(13);

  // Reset fields when modal is opened/closed
  useEffect(() => {
    if (isOpen) {
      setTaskName('');
      setTaskDate('');
      setTaskTime('');
      setRepeatType('none');
      setCustomEvery(1);
      setCustomUnit('week');
      setCustomDays([]);
      setCustomEnds('never');
      setCustomEndsOn('');
      setCustomEndsAfter(13);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const openCustomRepeatModal = () => {
    setTempEvery(customEvery);
    setTempUnit(customUnit);
    setTempDays([...customDays]);
    setTempEnds(customEnds);
    setTempEndsOn(customEndsOn);
    setTempEndsAfter(customEndsAfter);
    setIsCustomRepeatOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) return;

    let repeatValueStr = '';
    if (repeatType === 'custom') {
      repeatValueStr = JSON.stringify({
        every: customEvery,
        unit: customUnit,
        days: customDays,
        ends: customEnds,
        endsOn: customEndsOn,
        endsAfter: customEndsAfter,
      });
    }

    onSave({
      name: taskName.trim(),
      date: taskDate,
      time: taskTime,
      repeatType,
      repeatValue: repeatValueStr,
    });
    
    onClose();
  };

  return (
    <>
      <div
        className="modal-overlay open"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="modal">
          <div className="modal-title">{title}</div>
          <form onSubmit={handleFormSubmit}>
            <div className="form-field">
              <label htmlFor="task-name-input">Task Details</label>
              <input
                id="task-name-input"
                type="text"
                placeholder="e.g. buy groceries, reply to email"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
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
                onClick={onClose}
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

      {/* Custom Recurrence picker Modal overlay */}
      {isCustomRepeatOpen && (
        <div
          className="modal-overlay open"
          style={{ zIndex: 10000 }}
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
    </>
  );
}

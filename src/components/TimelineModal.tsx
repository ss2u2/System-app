import React, { useState, useMemo } from 'react';
import type { AppState, ActivityLog } from '../types';
import AnalyticsModal from './AnalyticsModal';
import { IconCalendarEvent, IconListDetails, IconTrophy } from '@tabler/icons-react';

interface TimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
}

export default function TimelineModal({ isOpen, onClose, state }: TimelineModalProps) {
  const [view, setView] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');

  // Generate a list of dates: 14 days past, 7 days future
  const dates = useMemo(() => {
    const list = [];
    const today = new Date();
    // Start from 7 days in the future down to 14 days in the past
    for (let i = -7; i <= 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      list.push(`${yyyy}-${mm}-${dd}`);
    }
    return list;
  }, []);

  const logsByDate = useMemo(() => {
    const map: Record<string, ActivityLog[]> = {};
    (state.activityLogs || []).forEach(log => {
      if (!map[log.date]) map[log.date] = [];
      map[log.date].push(log);
    });
    return map;
  }, [state.activityLogs]);

  // Aggregate stats based on view
  const aggregatedStats = useMemo(() => {
    if (view === 'daily') return null;
    const stats: Record<string, { tasks: number; sessions: number }> = {};
    
    (state.activityLogs || []).forEach(log => {
      if (log.action !== 'completed') return;
      const d = new Date(log.date);
      let key = log.date;
      
      if (view === 'weekly') {
        // Simple week string (e.g. "Week 42, 2026")
        const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
        const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
        const week = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        key = `Week ${week}, ${d.getFullYear()}`;
      } else if (view === 'monthly') {
        key = d.toLocaleString('default', { month: 'long', year: 'numeric' });
      } else if (view === 'yearly') {
        key = String(d.getFullYear());
      }
      
      if (!stats[key]) stats[key] = { tasks: 0, sessions: 0 };
      if (log.itemType === 'task') stats[key].tasks++;
      if (log.itemType === 'session') stats[key].sessions++;
    });
    return stats;
  }, [state.activityLogs, view]);

  return (
    <AnalyticsModal isOpen={isOpen} onClose={onClose} title="Activity Timeline">
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '8px' }}>
        {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              background: view === v ? 'var(--accent)' : 'var(--bg2)',
              color: view === v ? '#fff' : 'var(--text)',
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            {v}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {view === 'daily' ? (
          <div className="timeline-container" style={{ position: 'relative', paddingLeft: '44px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Main Vertical Line */}
            <div style={{ position: 'absolute', left: '15px', top: '24px', bottom: '0', width: '2px', background: 'var(--border)' }}></div>

            {dates.map(dateStr => {
              const logs = logsByDate[dateStr] || [];
              const groupDate = new Date(dateStr);
              
              // Only render date if there are logs OR if it's within the past 3 days/future 1 day to show continuity
              const todayStr = new Date().toISOString().split('T')[0];
              if (logs.length === 0 && dateStr !== todayStr) {
                 return null; // Skip empty days for cleaner timeline unless it's today
              }

              const monthStr = groupDate.toLocaleDateString(undefined, { month: 'short' });
              const dateNum = groupDate.getDate();
              const fullDateStr = groupDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
              const isToday = dateStr === todayStr;

              return (
                <div key={dateStr} style={{ position: 'relative' }}>
                  {/* Date Circle on the vertical line */}
                  <div style={{ 
                    position: 'absolute', 
                    left: '-45px', 
                    top: '0px', 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '50%', 
                    background: 'var(--bg)', 
                    border: isToday ? '2px solid var(--accent)' : '1px solid var(--border)', 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    color: isToday ? 'var(--accent)' : 'var(--text3)',
                    zIndex: 2,
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                  }}>
                    <span style={{ lineHeight: 1 }}>{monthStr}</span>
                    <span style={{ color: isToday ? 'var(--accent)' : 'var(--text)', fontSize: '11px', lineHeight: 1 }}>{dateNum}</span>
                  </div>

                  {/* Gradient Date Pill */}
                  <div style={{ 
                    display: 'inline-block',
                    padding: '6px 18px', 
                    borderRadius: '20px', 
                    background: isToday ? 'linear-gradient(90deg, #6366f1, #ec4899)' : 'var(--bg3)', 
                    color: isToday ? '#fff' : 'var(--text)', 
                    fontWeight: 600, 
                    fontSize: '13px',
                    marginBottom: '20px'
                  }}>
                    {isToday ? 'Today' : fullDateStr}
                  </div>

                  {/* Activity Cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {logs.length === 0 ? (
                       <div style={{ color: 'var(--text3)', fontSize: '13px', fontStyle: 'italic', paddingLeft: '16px' }}>No activities logged.</div>
                    ) : (
                      logs.map((act, i) => (
                        <div key={`${act.id}-${i}`} style={{
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '16px 20px',
                          background: 'var(--bg2)',
                          borderRadius: '12px',
                          boxShadow: act.action === 'completed' ? '0 0 0 1px rgba(16, 185, 129, 0.3)' : '0 0 0 1px rgba(239, 68, 68, 0.3)',
                          transition: 'transform 0.2s',
                        }}>
                          {/* Connecting horizontal line to main vertical line */}
                          <div style={{ position: 'absolute', left: '-28px', top: '50%', width: '28px', height: '2px', background: 'var(--border)' }}></div>
                          {/* Node on vertical line */}
                          <div style={{ position: 'absolute', left: '-33px', top: 'calc(50% - 5px)', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--bg)', border: `2px solid ${act.itemType === 'session' ? '#8b5cf6' : '#10b981'}`, zIndex: 2 }}></div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>{act.name}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ 
                                  fontSize: '11px', 
                                  padding: '2px 10px', 
                                  borderRadius: '12px', 
                                  background: 'var(--bg3)', 
                                  color: 'var(--text2)',
                                  fontWeight: 500
                                }}>
                                  {act.itemType === 'session' ? 'Session' : 'Task'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 500, color: act.action === 'completed' ? '#10b981' : '#ef4444' }}>
                              {act.action === 'completed' ? 'Completed' : 'Missed'}
                            </span>
                            <div style={{ 
                              width: '8px', height: '8px', borderRadius: '50%', 
                              background: act.action === 'completed' ? '#10b981' : '#ef4444',
                              boxShadow: act.action === 'completed' ? '0 0 10px #10b981' : '0 0 10px #ef4444'
                            }}></div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          aggregatedStats && Object.entries(aggregatedStats).length > 0 ? (
            Object.entries(aggregatedStats).map(([key, stats]) => (
              <div key={key} style={{ background: 'var(--bg2)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '16px' }}>{key}</div>
                <div style={{ display: 'flex', gap: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{stats.tasks}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text2)' }}>Tasks</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6' }}>{stats.sessions}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text2)' }}>Sessions</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ color: 'var(--text3)', textAlign: 'center', padding: '40px' }}>No activity data found.</div>
          )
        )}
      </div>
    </AnalyticsModal>
  );
}

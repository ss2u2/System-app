import { useState, useMemo } from 'react';
import type { AppState, Session } from '../types';
import AnalyticsModal from './AnalyticsModal';
import { IconFlame, IconTrophy, IconArrowLeft, IconChevronRight } from '@tabler/icons-react';

interface SessionAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
}

export default function SessionAnalyticsModal({ isOpen, onClose, state }: SessionAnalyticsModalProps) {
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [view, setView] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');

  const sessionLogs = useMemo(() => state.activityLogs?.filter(l => l.itemType === 'session') || [], [state.activityLogs]);
  
  const sessionsCompleted = sessionLogs.filter(l => l.action === 'completed').length;
  const sessionsMissed = sessionLogs.filter(l => l.action === 'missed').length;
  const sessionRate = sessionsCompleted + sessionsMissed > 0 ? Math.round((sessionsCompleted / (sessionsCompleted + sessionsMissed)) * 100) : 0;
  
  const bestSessionStreak = (state.sessions || []).reduce((max, s) => Math.max(max, s.streak || 0), 0);

  const renderCalendar = () => {
    if (!selectedSession) return null;
    
    // Simple calendar logic
    const today = new Date();
    
    // Instead of rendering a flat list, we need to generate standard calendar cells if we are in monthly/yearly view.
    const renderGrid = (startDate: Date, numDays: number, showMonthHeaders = false) => {
      const days = [];
      
      // Calculate offset so we start on Sunday (0)
      const firstDayOffset = new Date(startDate).getDay();
      
      // Empty cells for offset
      for (let i = 0; i < firstDayOffset; i++) {
        days.push(<div key={`empty-${i}`} style={{ padding: '8px' }}></div>);
      }
      
      for (let i = 0; i < numDays; i++) {
        const d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
        if (showMonthHeaders && d.getDate() === 1 && i > 0) {
           // We could inject month headers here if we had a non-grid layout, 
           // but since it's a grid, we'll rely on the top-level grouping for Yearly view.
        }
        
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        
        // Use true JS Day (0=Sun, 6=Sat) for standard grid logic
        const jsDayOfWeek = d.getDay(); 
        
        // Map 0=Sun, 1=Mon back to the App's storage (which might be 0=Mon. Assuming App uses 0=Mon, 6=Sun)
        const appDayOfWeek = (jsDayOfWeek === 0) ? 6 : jsDayOfWeek - 1;
        
        const isScheduled = selectedSession.repeatDays?.includes(appDayOfWeek);
        
        const log = sessionLogs.find(l => l.itemId === selectedSession.id && l.date === dateStr);
        const isDone = log?.action === 'completed';
        const isPast = d.getTime() < new Date().getTime() - 86400000; // Past day
        const isMissed = log?.action === 'missed' || (isScheduled && !isDone && isPast);
  
        let bgColor = 'var(--bg3)';
        let borderStyle = '1px solid transparent';
        let color = 'var(--text)';
        
        if (isDone) {
          bgColor = '#10b981'; // Filled solid green
          color = '#fff';
        } else if (isMissed) {
          bgColor = 'rgba(239, 68, 68, 0.2)'; // Translucent red
          color = '#ef4444';
        } else if (isScheduled) {
          bgColor = 'var(--bg2)';
          borderStyle = '1px dashed var(--border)'; // Dotted/dashed line
        } else {
          color = 'var(--text3)'; // Grayed out
        }
  
        days.push(
          <div key={dateStr} style={{ 
            background: bgColor, 
            border: borderStyle,
            borderRadius: '6px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '36px',
            fontSize: '13px',
            fontWeight: isDone || isMissed ? 'bold' : 'normal',
            color: color
          }}>
            {d.getDate()}
          </div>
        );
      }
      return days;
    };

    let calendarContent = null;

    if (view === 'weekly') {
      const start = new Date();
      start.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
      calendarContent = (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d} style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text3)' }}>{d}</div>)}
          {renderGrid(start, 7)}
        </div>
      );
    } else if (view === 'monthly') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      calendarContent = (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={`hdr-${i}`} style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text3)' }}>{d}</div>)}
          {renderGrid(start, daysInMonth)}
        </div>
      );
    } else if (view === 'yearly') {
      // Render the last 12 months in separate grids
      const months = [];
      for(let i=11; i>=0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthName = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
        const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        months.push(
          <div key={monthName} style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>{monthName}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
               {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => <div key={`yr-hdr-${monthName}-${idx}`} style={{ textAlign: 'center', fontSize: '10px', color: 'var(--text3)' }}>{day}</div>)}
               {renderGrid(d, daysInMonth)}
            </div>
          </div>
        );
      }
      calendarContent = <div>{months.reverse()}</div>; // Show recent first
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <button 
          onClick={() => setSelectedSession(null)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', padding: 0 }}
        >
          <IconArrowLeft size={16} /> Back to Sessions
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--bg2)', borderRadius: '12px' }}>
          <span style={{ fontSize: '24px' }}>{selectedSession.icon}</span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{selectedSession.name}</span>
            <span style={{ fontSize: '12px', color: 'var(--text2)' }}>Current streak: {selectedSession.streak || 0} 🔥</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {(['weekly', 'monthly', 'yearly'] as const).map(t => (
            <button
              key={t}
              onClick={() => setView(t)}
              style={{
                flex: 1, padding: '6px', borderRadius: '6px', border: 'none',
                background: view === t ? 'var(--accent)' : 'var(--bg2)',
                color: view === t ? '#fff' : 'var(--text)',
                cursor: 'pointer', textTransform: 'capitalize', fontSize: '13px', fontWeight: 600
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <div style={{ 
          maxHeight: '400px',
          overflowY: 'auto',
          paddingRight: '4px'
        }}>
          {calendarContent}
        </div>
      </div>
    );
  };

  return (
    <AnalyticsModal isOpen={isOpen} onClose={() => { setSelectedSession(null); onClose(); }} title="Session Insights">
      {selectedSession ? renderCalendar() : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: 'var(--bg3)', padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '8px' }}>Consistency Score</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {sessionRate}%
                <IconTrophy size={20} color="#8b5cf6" />
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>{sessionsCompleted} sessions done</div>
            </div>
            <div style={{ background: 'var(--bg3)', padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '8px' }}>Best Ongoing Streak</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {bestSessionStreak} 
                <IconFlame size={20} color="#f59e0b" />
              </div>
            </div>
          </div>

          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--text)' }}>Drill down by Session</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(state.sessions || []).length === 0 && <div style={{ color: 'var(--text3)' }}>No sessions created yet.</div>}
            {(state.sessions || []).map((session, i) => (
              <div 
                key={i} 
                onClick={() => setSelectedSession(session)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg2)', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '20px' }}>{session.icon}</span>
                  <span style={{ fontWeight: 500, fontSize: '15px' }}>{session.name}</span>
                </div>
                <div style={{ 
                  width: '28px', height: '28px', borderRadius: '50%', 
                  background: 'var(--bg3)', display: 'flex', alignItems: 'center', 
                  justifyContent: 'center', color: 'var(--text2)' 
                }}>
                  <IconChevronRight size={16} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </AnalyticsModal>
  );
}

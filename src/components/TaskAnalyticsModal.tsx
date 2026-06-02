import { useState, useMemo } from 'react';
import type { AppState } from '../types';
import AnalyticsModal from './AnalyticsModal';
import { IconChartBar, IconListDetails } from '@tabler/icons-react';

interface TaskAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
}

export default function TaskAnalyticsModal({ isOpen, onClose, state }: TaskAnalyticsModalProps) {
  const [tab, setTab] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  
  const taskLogs = useMemo(() => state.activityLogs?.filter(l => l.itemType === 'task') || [], [state.activityLogs]);
  
  const tasksCompleted = taskLogs.filter(l => l.action === 'completed').length;
  const tasksMissed = taskLogs.filter(l => l.action === 'missed').length;
  const taskRate = tasksCompleted + tasksMissed > 0 ? Math.round((tasksCompleted / (tasksCompleted + tasksMissed)) * 100) : 0;

  // Chart data aggregation
  const chartData = useMemo(() => {
    const data: { label: string; count: number }[] = [];
    const today = new Date();
    
    if (tab === 'weekly') {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const count = taskLogs.filter(l => l.date === dayStr && l.action === 'completed').length;
        data.push({ label: d.toLocaleDateString(undefined, { weekday: 'short' }), count });
      }
    } else if (tab === 'monthly') {
      // Last 4 weeks
      for (let i = 3; i >= 0; i--) {
        const start = new Date(today);
        start.setDate(today.getDate() - (i * 7 + 7));
        const end = new Date(today);
        end.setDate(today.getDate() - (i * 7));
        const count = taskLogs.filter(l => {
          if (l.action !== 'completed') return false;
          const ld = new Date(l.date);
          return ld > start && ld <= end;
        }).length;
        data.push({ label: `Week ${4-i}`, count });
      }
    } else if (tab === 'yearly') {
      // Last 12 months
      for (let i = 11; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const count = taskLogs.filter(l => l.action === 'completed' && l.date.startsWith(`${y}-${m}`)).length;
        data.push({ label: d.toLocaleDateString(undefined, { month: 'short' }), count });
      }
    }
    return data;
  }, [taskLogs, tab]);

  const maxCount = Math.max(...chartData.map(d => d.count), 1);

  return (
    <AnalyticsModal isOpen={isOpen} onClose={onClose} title="Task Insights">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--bg3)', padding: '16px', borderRadius: '12px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '8px' }}>All-time Completion</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {taskRate}%
            <IconChartBar size={20} color="#10b981" />
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>{tasksCompleted} total tasks done</div>
        </div>
        <div style={{ background: 'var(--bg3)', padding: '16px', borderRadius: '12px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '8px' }}>Most Active Day</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text)' }}>
            {taskLogs.length > 0 ? new Date(taskLogs[0].date).toLocaleDateString(undefined, { weekday: 'long' }) : 'N/A'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {(['weekly', 'monthly', 'yearly'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              background: tab === t ? 'var(--accent)' : 'var(--bg2)',
              color: tab === t ? '#fff' : 'var(--text)',
              cursor: 'pointer',
              textTransform: 'capitalize',
              fontWeight: 600
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={{ background: 'var(--bg2)', padding: '24px 16px', borderRadius: '12px', marginBottom: '24px', height: '200px', display: 'flex', alignItems: 'flex-end', gap: '8px', justifyContent: 'space-between' }}>
        {chartData.map((d, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 }}>
            <div style={{ fontSize: '10px', color: 'var(--text3)' }}>{d.count > 0 ? d.count : ''}</div>
            <div style={{ width: '100%', maxWidth: '30px', background: 'var(--accent)', borderRadius: '4px 4px 0 0', height: `${(d.count / maxCount) * 120}px`, transition: 'height 0.3s' }}></div>
            <div style={{ fontSize: '10px', color: 'var(--text2)' }}>{d.label}</div>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--text)' }}>Recent Task Activity</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {taskLogs.length === 0 && <div style={{ color: 'var(--text3)' }}>No task data yet.</div>}
        {taskLogs.slice(0, 5).map((log, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--bg2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <IconListDetails size={18} color="var(--text2)" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 500, fontSize: '14px' }}>{log.name}</span>
                <span style={{ fontSize: '11px', color: 'var(--text3)' }}>{log.date}</span>
              </div>
            </div>
            <span style={{ fontSize: '12px', color: log.action === 'completed' ? '#10b981' : '#ef4444', background: log.action === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>
              {log.action}
            </span>
          </div>
        ))}
      </div>
    </AnalyticsModal>
  );
}

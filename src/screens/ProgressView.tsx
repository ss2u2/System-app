import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { AppState } from '../types';
import { IconCheck, IconTarget, IconFlame, IconTrophy, IconHistory } from '@tabler/icons-react';
import TaskAnalyticsModal from '../components/TaskAnalyticsModal';
import SessionAnalyticsModal from '../components/SessionAnalyticsModal';
import TimelineModal from '../components/TimelineModal';

export default function ProgressView() {
  const { state } = useOutletContext<{ state: AppState }>();

  // Calculate today's details
  const getTodayStats = () => {
    const all = [
      ...(state.sessions || []).flatMap((s) => s.steps || []),
      ...(state.tasks || []),
    ];
    const done = all.filter((x) => x.done).length;
    const score = all.length ? Math.round((done / all.length) * 100) : 0;
    const tasksDone = (state.tasks || []).filter((t) => t.done).length;
    const sessionsDone = (state.sessions || []).filter((s) =>
      (s.steps || []).length > 0 && (s.steps || []).every((x) => x.done)
    ).length;

    return { score, tasksDone, sessionsDone };
  };

  const { score, tasksDone, sessionsDone } = getTodayStats();

  // Overlay state
  const [activeModal, setActiveModal] = useState<'tasks' | 'sessions' | 'timeline' | null>(null);





  return (
    <div className="main-view active" style={{ overflowY: 'auto', padding: '20px', paddingBottom: '100px' }}>
      
      {/* Stats Header Grid */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          <div className="stat-val" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {state.streak || 0}
            <IconFlame size={20} color="#f59e0b" />
          </div>
          <div className="stat-lbl">Global Day Streak</div>
          <div className="stat-sub">Keep it up!</div>
        </div>
        <div className="stat-card" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          <div className="stat-val" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {score}%
            <IconTarget size={20} color="var(--accent)" />
          </div>
          <div className="stat-lbl">Today's score</div>
        </div>
        <div 
          className="stat-card clickable" 
          style={{ background: 'var(--bg2)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s' }}
          onClick={() => setActiveModal('tasks')}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--text)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <div className="stat-val" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {tasksDone}
            <IconCheck size={20} color="#10b981" />
          </div>
          <div className="stat-lbl">Tasks done today</div>
          <div className="stat-sub" style={{ color: 'var(--accent)' }}>View insights &rarr;</div>
        </div>
        <div 
          className="stat-card clickable" 
          style={{ background: 'var(--bg2)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s' }}
          onClick={() => setActiveModal('sessions')}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--text)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <div className="stat-val" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {sessionsDone}
            <IconTrophy size={20} color="#8b5cf6" />
          </div>
          <div className="stat-lbl">Sessions completed</div>
          <div className="stat-sub" style={{ color: 'var(--accent)' }}>View insights &rarr;</div>
        </div>
        <div 
          className="stat-card clickable" 
          style={{ background: 'var(--bg2)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s', gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          onClick={() => setActiveModal('timeline')}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--text)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <div>
            <div className="stat-lbl" style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text)' }}>Progress Timeline</div>
            <div className="stat-sub">Review your historical activity</div>
          </div>
          <IconHistory size={24} color="var(--accent)" />
        </div>
      </div>

      <TaskAnalyticsModal isOpen={activeModal === 'tasks'} onClose={() => setActiveModal(null)} state={state} />
      <SessionAnalyticsModal isOpen={activeModal === 'sessions'} onClose={() => setActiveModal(null)} state={state} />
      <TimelineModal isOpen={activeModal === 'timeline'} onClose={() => setActiveModal(null)} state={state} />
    </div>
  );
}

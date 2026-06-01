import { type ReactNode } from 'react';
import { useOutletContext } from 'react-router-dom';

import type { AppState } from '../types';

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
      (s.steps || []).every((x) => x.done)
    ).length;

    return { score, tasksDone, sessionsDone };
  };

  const { score, tasksDone, sessionsDone } = getTodayStats();

  // Generate 14-day activity history
  const render14DayActivity = () => {
    const days: ReactNode[] = [];
    const now = new Date();

    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toDateString();
      const pct = state.completionHistory?.[dateStr] ?? 0;
      const isToday = i === 0;

      let cls = 'streak-day';
      // If completed at least 50% of goals that day, mark it green/active
      if (pct >= 50 && !isToday) {
        cls += ' done';
      }
      if (isToday) {
        cls += ' today';
      }

      days.push(
        <div key={i} className={cls} title={`${dateStr}: ${pct}% completed`}>
          {d.getDate()}
        </div>
      );
    }
    return days;
  };

  return (
    <div className="main-view active" style={{ overflowY: 'auto', padding: '20px' }}>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-val">{state.streak || 0}</div>
          <div className="stat-lbl">Day streak</div>
          <div className="stat-sub">Personal best!</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">{score}%</div>
          <div className="stat-lbl">Today's score</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">{tasksDone}</div>
          <div className="stat-lbl">Tasks done today</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">{sessionsDone}</div>
          <div className="stat-lbl">Sessions completed</div>
        </div>
      </div>

      <div className="sec-hdr">
        <span className="sec-title">14-day activity</span>
      </div>
      <div className="prog-bar-wrap">
        <div className="streak-bar">{render14DayActivity()}</div>
      </div>


    </div>
  );
}

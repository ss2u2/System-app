import { type ReactNode } from 'react';
import { IconFlag } from '@tabler/icons-react';
import type { AppState } from '../types';

interface ProgressViewProps {
  state: AppState;
}

export default function ProgressView({ state }: ProgressViewProps) {
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

      <div className="divider"></div>

      <div className="sec-hdr">
        <span className="sec-title">Life Goals overview</span>
      </div>

      <div className="static-list">
        {state.static && state.static.length > 0 ? (
          state.static.map((g) => {
            const pct = Math.min(100, Math.round(g.progress));
            const fillCls = pct >= 70 ? 'fill-green' : pct >= 35 ? 'fill-amber' : 'fill-red';

            return (
              <div key={g.id} className="static-card">
                <div className="static-top">
                  <div className="static-emoji">{g.emoji}</div>
                  <div className="static-info">
                    <div className="static-name">{g.name}</div>
                    {g.note && <div className="static-note">{g.note}</div>}
                  </div>
                </div>
                <div className="static-bottom">
                  <div className="static-status-row">
                    <div className="static-prog-track">
                      <div className={`static-prog-fill ${fillCls}`} style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                  <span className="static-pct">{pct}%</span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty">
            <IconFlag />
            No life goals yet.
          </div>
        )}
      </div>
    </div>
  );
}

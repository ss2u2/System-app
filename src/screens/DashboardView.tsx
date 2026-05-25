import React, { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  IconSun,
  IconLayersIntersect,
  IconCalendarWeek,
  IconCalendarMonth,
  IconFlag,
  IconArrowRight,
  IconPlus,
  IconChevronDown,
  IconCheck,
  IconTrash,
  IconPointFilled,
  IconClipboard,
} from '@tabler/icons-react';
import { store } from '../services/db';
import type { AppState, Task, Session, WeeklyGoal, MonthlyGoal, StaticGoal } from '../types';
import TaskItem from '../components/TaskItem';
import AddTaskModal from '../components/AddTaskModal';
import { generateSecureNumericId } from '../utils/taskHelper';
// Import UI Design System components
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Card from '../components/ui/Card';
import FormField from '../components/ui/FormField';

export default function DashboardView() {
  type ModalType = 'task' | 'session' | 'goal' | 'static' | null;
  const navigate = useNavigate();

  // Retrieve shared state and handlers from Outlet Context
  const {
    state,
    handleGlobalToggleTask,
    handleGlobalDeleteTask,
  } = useOutletContext<{
    state: AppState;
    handleGlobalToggleTask: (id: number | string) => void;
    handleGlobalDeleteTask: (id: number | string) => void;
  }>();

  const [subTab, setSubTab] = useState<'today' | 'sessions' | 'weekly' | 'monthly' | 'static'>('today');

  // Modals state
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const [sessionName, setSessionName] = useState('');
  const [sessionIcon, setSessionIcon] = useState('🏋️');
  const [sessionColor, setSessionColor] = useState('accent');
  const [sessionSteps, setSessionSteps] = useState('');

  const [goalType, setGoalType] = useState<'weekly' | 'monthly'>('weekly');
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState<number | string>(5);
  const [goalCurrent, setGoalCurrent] = useState<number | string>(0);

  const [lifeGoalName, setLifeGoalName] = useState('');
  const [lifeGoalEmoji, setLifeGoalEmoji] = useState('🎯');
  const [lifeGoalNote, setLifeGoalNote] = useState('');

  const colorMap: Record<string, string> = {
    accent: '#7c6af7',
    green: '#4ade80',
    amber: '#f59e0b',
    blue: '#60a5fa',
    pink: '#e879f9',
  };
  const colorBgMap: Record<string, string> = {
    accent: '#1e1a3a',
    green: '#0d2a1a',
    amber: '#2a1f07',
    blue: '#0d1f3a',
    pink: '#2a0a2e',
  };

  // Filter tasks that belong to Today dashboard (no listId or listId is 'toady')
  const getTodayTasks = () => {
    return (state.tasks || []).filter(
      (t) => !t.listId || t.listId === 'toady'
    );
  };

  // Calculate today score
  const calculateTodayScore = () => {
    const todayTasks = getTodayTasks();
    const all = [
      ...(state.sessions || []).flatMap((s) => s.steps || []),
      ...todayTasks,
    ];
    const done = all.filter((x) => x.done).length;
    return all.length ? Math.round((done / all.length) * 100) : 0;
  };

  const score = calculateTodayScore();

  // Handlers
  const toggleTodaySession = (index: number) => {
    const updated = [...state.sessions];
    updated[index].open = !updated[index].open;
    store.setState({ sessions: updated });
  };

  const toggleStep = (sessIndex: number, stepIndex: number) => {
    const updated = [...state.sessions];
    updated[sessIndex].steps[stepIndex].done = !updated[sessIndex].steps[stepIndex].done;
    store.setState({ sessions: updated });
  };

  const handleToggleStar = (taskId: number | string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = state.tasks.map(t => {
      if (t.id === taskId) {
        return { 
          ...t, 
          starred: !t.starred,
          listId: t.listId || 'toady'
        };
      }
      return t;
    });
    store.setState({ tasks: updated });
  };

  const handleDeleteTask = (taskId: number | string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this task?')) {
      handleGlobalDeleteTask(taskId);
    }
  };

  const handleDeleteSession = (index: number) => {
    const sessionToDelete = state.sessions[index];
    if (window.confirm(`Delete "${sessionToDelete.name}"?`)) {
      const updated = state.sessions.filter((_, idx) => idx !== index);
      const deletedIds = {
        ...(state.deletedIds || {}),
        sessions: [...(state.deletedIds?.sessions || []), sessionToDelete.id],
      };
      store.setState({ sessions: updated, deletedIds });
    }
  };

  const handleUpdateStaticProg = (index: number, val: string) => {
    const updated = [...state.static];
    updated[index].progress = parseInt(val, 10);
    store.setState({ static: updated });
  };

  // Saves
  const handleSaveNewTask = (taskData: {
    name: string;
    details: string;
    listId: number | string;
    starred: boolean;
    date: string;
    time: string;
    repeatType: 'none' | 'daily' | 'custom';
    repeatValue: string;
    deadline: string;
  }) => {
    const newTaskId = generateSecureNumericId();
    const newTask: Task = {
      id: newTaskId,
      name: taskData.name,
      details: taskData.details,
      done: false,
      listId: taskData.listId || 'toady',
      starred: taskData.starred || false,
      createdAt: Date.now(),
      date: taskData.date || undefined,
      time: taskData.time || undefined,
      repeatType: taskData.repeatType || 'none',
      repeatValue: taskData.repeatValue || '',
      deadline: taskData.deadline || undefined,
      cat: '',
      subtasks: []
    };
    store.setState({ tasks: [...(state.tasks || []), newTask] });
  };

  const saveSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionName.trim() || !sessionSteps.trim()) return;
    const steps = sessionSteps
      .split('\n')
      .filter(Boolean)
      .map((line: string) => {
        const parts = line.split('|');
        return {
          name: parts[0].trim(),
          dur: parts[1] ? parts[1].trim() : '—',
          done: false,
        };
      });

    const newSession: Session = {
      id: generateSecureNumericId(),
      name: sessionName.trim(),
      icon: sessionIcon.trim() || '⚡',
      color: sessionColor,
      steps,
      open: false,
    };

    store.setState({ sessions: [...state.sessions, newSession] });
    setSessionName('');
    setSessionIcon('🏋️');
    setSessionSteps('');
    setActiveModal(null);
  };

  const saveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName.trim()) return;
    const newGoal = {
      id: generateSecureNumericId(),
      name: goalName.trim(),
      target: parseInt(goalTarget as string, 10) || 5,
      current: parseInt(goalCurrent as string, 10) || 0,
    };

    if (goalType === 'weekly') {
      const updated: WeeklyGoal[] = [...state.weekly, newGoal];
      store.setState({ weekly: updated });
    } else {
      const updated: MonthlyGoal[] = [...state.monthly, newGoal];
      store.setState({ monthly: updated });
    }
    setGoalName('');
    setGoalTarget(5);
    setGoalCurrent(0);
    setActiveModal(null);
  };

  const saveStaticGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lifeGoalName.trim()) return;
    const newLifeGoal: StaticGoal = {
      id: generateSecureNumericId(),
      name: lifeGoalName.trim(),
      emoji: lifeGoalEmoji.trim() || '🎯',
      note: lifeGoalNote.trim(),
      cat: '',
      progress: 0,
    };
    store.setState({ static: [...state.static, newLifeGoal] });
    setLifeGoalName('');
    setLifeGoalEmoji('🎯');
    setLifeGoalNote('');
    setActiveModal(null);
  };

  const handleEditTask = (taskId: number | string) => {
    navigate(`/detail/${taskId}`);
  };

  return (
    <div className="main-view active">
      {/* Sub Tabs */}
      <div className="sub-tabs">
        <button
          className={`sub-tab ${subTab === 'today' ? 'active' : ''}`}
          onClick={() => setSubTab('today')}
        >
          <IconSun size={14} />
          Today
        </button>
        <button
          className={`sub-tab ${subTab === 'sessions' ? 'active' : ''}`}
          onClick={() => setSubTab('sessions')}
        >
          <IconLayersIntersect size={14} />
          Sessions
        </button>
        <button
          className={`sub-tab ${subTab === 'weekly' ? 'active' : ''}`}
          onClick={() => setSubTab('weekly')}
        >
          <IconCalendarWeek size={14} />
          Weekly
        </button>
        <button
          className={`sub-tab ${subTab === 'monthly' ? 'active' : ''}`}
          onClick={() => setSubTab('monthly')}
        >
          <IconCalendarMonth size={14} />
          Monthly
        </button>
        <button
          className={`sub-tab ${subTab === 'static' ? 'active' : ''}`}
          onClick={() => setSubTab('static')}
        >
          <IconFlag size={14} />
          Life Goals
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {/* ==================== TODAY VIEW ==================== */}
        {subTab === 'today' && (
          <div className="view active">
            <div className="prog-bar-wrap">
              <div className="prog-bar-label">
                <span>Today's progress</span>
                <span>{score}%</span>
              </div>
              <div className="prog-track">
                <div className="prog-fill" style={{ width: `${score}%` }}></div>
              </div>
            </div>

            {/* Sessions Section */}
            <div className="sec-hdr">
              <span className="sec-title">Sessions</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSubTab('sessions')}
                className="add-btn"
              >
                <IconArrowRight size={13} />
                Manage
              </Button>
            </div>

            <div id="today-sessions">
              {state.sessions && state.sessions.length > 0 ? (
                state.sessions.map((s, si) => {
                  const total = s.steps.length;
                  const done = s.steps.filter((x) => x.done).length;
                  const pct = total ? Math.round((done / total) * 100) : 0;
                  const c = colorMap[s.color] || colorMap.accent;
                  const cbg = colorBgMap[s.color] || colorBgMap.accent;
                  const r = 13;
                  const circ = 2 * Math.PI * r;
                  const offset = circ - (pct / 100) * circ;

                  return (
                    <Card
                      key={s.id}
                      padding={false}
                      className={`session-card ${s.open ? 'open' : ''}`}
                    >
                      <div className="session-head" onClick={() => toggleTodaySession(si)}>
                        <div className="session-icon" style={{ background: cbg, color: c }}>
                          {s.icon}
                        </div>
                        <div className="session-meta">
                          <div className="session-name">{s.name}</div>
                          <div className="session-sub">
                            {done}/{total} steps · {pct}% done
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div className="prog-ring">
                            <svg width="32" height="32" viewBox="0 0 32 32">
                              <circle cx="16" cy="16" r={r} stroke={cbg} strokeWidth="3" fill="none" />
                              <circle
                                cx="16"
                                cy="16"
                                r={r}
                                stroke={c}
                                strokeWidth="3"
                                fill="none"
                                strokeDasharray={circ}
                                strokeDashoffset={offset}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="prog-num" style={{ color: c }}>
                              {pct}%
                            </div>
                          </div>
                          <IconChevronDown size={14} className="session-expand" />
                        </div>
                      </div>
                      <div className="session-body">
                        <div className="step-list">
                          {s.steps.map((step, i) => (
                            <div
                              key={i}
                              className={`step-item ${step.done ? 'done' : ''}`}
                              onClick={() => toggleStep(si, i)}
                            >
                              <div className="step-check">
                                <IconCheck size={10} />
                              </div>
                              <div className="step-name">
                                {i + 1}. {step.name}
                              </div>
                              <div className="step-dur">{step.dur}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>
                  );
                })
              ) : (
                <div className="empty">
                  <IconLayersIntersect />
                  No sessions. Create them in the Sessions tab.
                </div>
              )}
            </div>

            <div className="divider"></div>

            {/* Tasks Section */}
            <div className="sec-hdr">
              <span className="sec-title">Tasks</span>
              <Button onClick={() => setActiveModal('task')} className="add-btn" size="sm">
                <IconPlus size={13} />
                Add Task
              </Button>
            </div>

            <div className="tasks-list">
              {getTodayTasks().length > 0 ? (
                getTodayTasks().map((t) => (
                  <TaskItem
                    key={t.id}
                    task={t}
                    onToggle={handleGlobalToggleTask}
                    onToggleStar={handleToggleStar}
                    onDelete={handleDeleteTask}
                    onEdit={handleEditTask}
                  />
                ))
              ) : (
                <div className="empty">
                  <IconClipboard />
                  No tasks yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== SESSIONS MANAGER ==================== */}
        {subTab === 'sessions' && (
          <div className="view active">
            <div className="sec-hdr">
              <span className="sec-title">Your Sessions</span>
              <Button onClick={() => setActiveModal('session')} className="add-btn" size="sm">
                <IconPlus size={13} />
                New Session
              </Button>
            </div>

            <div id="sessions-manager" className="space-y-4">
              {state.sessions && state.sessions.length > 0 ? (
                state.sessions.map((s, si) => {
                  const c = colorMap[s.color] || colorMap.accent;
                  const cbg = colorBgMap[s.color] || colorBgMap.accent;

                  return (
                    <Card key={s.id} padding={false} className="sm-card">
                      <div className="sm-head">
                        <div className="sm-icon" style={{ background: cbg, color: c }}>
                          {s.icon}
                        </div>
                        <div className="sm-meta">
                          <div className="sm-name">{s.name}</div>
                          <div className="sm-sub">{s.steps.length} steps</div>
                        </div>
                        <div className="sm-actions">
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteSession(si)}
                            style={{ padding: '8px', minWidth: 'auto', borderRadius: '50%' }}
                          >
                            <IconTrash size={14} />
                          </Button>
                        </div>
                      </div>
                      <div className="sm-steps-preview">
                        {s.steps.map((st, i) => (
                          <div key={i} className="sm-step-row">
                            <IconPointFilled size={8} />
                            <span className="sm-step-name">
                              {i + 1}. {st.name}
                            </span>
                            <span className="sm-step-dur">{st.dur}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  );
                })
              ) : (
                <div className="empty">
                  <IconLayersIntersect />
                  No sessions yet. Create your first one!
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== WEEKLY GOALS ==================== */}
        {subTab === 'weekly' && (
          <div className="view active">
            <div className="sec-hdr">
              <span className="sec-title">Weekly Goals</span>
              <Button
                onClick={() => {
                  setGoalType('weekly');
                  setActiveModal('goal');
                }}
                className="add-btn"
                size="sm"
              >
                <IconPlus size={13} />
                Add Goal
              </Button>
            </div>

            <div className="goals-list">
              {state.weekly && state.weekly.length > 0 ? (
                state.weekly.map((g) => {
                  const pct = Math.min(100, Math.round((g.current / g.target) * 100));
                  const cls = pct >= 80 ? 'fill-green' : pct >= 40 ? 'fill-amber' : 'fill-red';
                  const scls = pct >= 80 ? 'status-on' : pct >= 40 ? 'status-at' : 'status-off';
                  const slbl = pct >= 80 ? 'On track' : pct >= 40 ? 'In progress' : 'Needs work';

                  return (
                    <Card key={g.id} className="goal-item">
                      <div className="goal-top">
                        <div className="goal-name">{g.name}</div>
                        <span className={`goal-status ${scls}`}>{slbl}</span>
                      </div>
                      <div className="goal-prog-row">
                        <div className="goal-prog-track">
                          <div className={`goal-prog-fill ${cls}`} style={{ width: `${pct}%` }}></div>
                        </div>
                        <span className="goal-pct">
                          {g.current}/{g.target} · {pct}%
                        </span>
                      </div>
                    </Card>
                  );
                })
              ) : (
                <div className="empty">
                  <IconCalendarWeek />
                  No weekly goals yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== MONTHLY GOALS ==================== */}
        {subTab === 'monthly' && (
          <div className="view active">
            <div className="sec-hdr">
              <span className="sec-title">Monthly Goals</span>
              <Button
                onClick={() => {
                  setGoalType('monthly');
                  setActiveModal('goal');
                }}
                className="add-btn"
                size="sm"
              >
                <IconPlus size={13} />
                Add Goal
              </Button>
            </div>

            <div className="goals-list">
              {state.monthly && state.monthly.length > 0 ? (
                state.monthly.map((g) => {
                  const pct = Math.min(100, Math.round((g.current / g.target) * 100));
                  const cls = pct >= 80 ? 'fill-green' : pct >= 40 ? 'fill-amber' : 'fill-red';
                  const scls = pct >= 80 ? 'status-on' : pct >= 40 ? 'status-at' : 'status-off';
                  const slbl = pct >= 80 ? 'On track' : pct >= 40 ? 'In progress' : 'Needs work';

                  return (
                    <Card key={g.id} className="goal-item">
                      <div className="goal-top">
                        <div className="goal-name">{g.name}</div>
                        <span className={`goal-status ${scls}`}>{slbl}</span>
                      </div>
                      <div className="goal-prog-row">
                        <div className="goal-prog-track">
                          <div className={`goal-prog-fill ${cls}`} style={{ width: `${pct}%` }}></div>
                        </div>
                        <span className="goal-pct">
                          {g.current}/{g.target} · {pct}%
                        </span>
                      </div>
                    </Card>
                  );
                })
              ) : (
                <div className="empty">
                  <IconCalendarMonth />
                  No monthly goals yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== LIFE GOALS (STATIC) ==================== */}
        {subTab === 'static' && (
          <div className="view active">
            <div className="sec-hdr">
              <span className="sec-title">Life Goals</span>
              <Button onClick={() => setActiveModal('static')} className="add-btn" size="sm">
                <IconPlus size={13} />
                Add Goal
              </Button>
            </div>

            <div className="static-list">
              {state.static && state.static.length > 0 ? (
                state.static.map((g, gi) => {
                  const pct = Math.min(100, Math.round(g.progress));
                  const fillCls = pct >= 70 ? 'fill-green' : pct >= 35 ? 'fill-amber' : 'fill-red';

                  return (
                    <Card key={g.id} hoverable className="static-card">
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
                            <div
                              className={`static-prog-fill ${fillCls}`}
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                        </div>
                        <span className="static-pct">{pct}%</span>
                      </div>
                      <div className="static-edit-row" style={{ marginTop: '12px' }}>
                        <label htmlFor={`range-goal-${g.id}`}>Progress</label>
                        <input
                          id={`range-goal-${g.id}`}
                          type="range"
                          min="0"
                          max="100"
                          value={pct}
                          step="1"
                          onChange={(e) => handleUpdateStaticProg(gi, e.target.value)}
                          className="flex-1 accent-[#7c6af7]"
                        />
                        <span>{pct}%</span>
                      </div>
                    </Card>
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
        )}
      </div>

      {/* ==================== ADD TASK MODAL ==================== */}
      <AddTaskModal
        isOpen={activeModal === 'task'}
        onClose={() => setActiveModal(null)}
        initialListId="toady"
        initialStarred={false}
        onSave={handleSaveNewTask}
      />

      {/* ==================== ADD SESSION MODAL ==================== */}
      <Modal
        isOpen={activeModal === 'session'}
        onClose={() => setActiveModal(null)}
        title="New Session"
      >
        <form onSubmit={saveSession}>
          <FormField label="Session name" htmlFor="modal-session-name">
            <input
              id="modal-session-name"
              type="text"
              placeholder="e.g. Morning Exercise"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="ui-input"
              autoFocus
              required
            />
          </FormField>
          <FormField label="Emoji icon" htmlFor="modal-session-icon">
            <input
              id="modal-session-icon"
              type="text"
              placeholder="🏋️"
              maxLength={2}
              value={sessionIcon}
              onChange={(e) => setSessionIcon(e.target.value)}
              className="ui-input"
            />
          </FormField>
          <FormField label="Color theme" htmlFor="modal-session-color">
            <select
              id="modal-session-color"
              value={sessionColor}
              onChange={(e) => setSessionColor(e.target.value)}
              className="ui-select"
            >
              <option value="accent">Purple</option>
              <option value="green">Green</option>
              <option value="amber">Amber</option>
              <option value="blue">Blue</option>
              <option value="pink">Pink</option>
            </select>
          </FormField>
          <FormField label="Steps — one per line: Name | duration (e.g. Stretch | 5 min)" htmlFor="modal-session-steps">
            <textarea
              id="modal-session-steps"
              placeholder={'Stretch | 5 min\nDeep work | 45 min\nMeditation | 10 min'}
              value={sessionSteps}
              onChange={(e) => setSessionSteps(e.target.value)}
              className="ui-textarea"
              required
            ></textarea>
          </FormField>
          <div className="modal-actions" style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <Button type="button" onClick={() => setActiveModal(null)} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" style={{ flex: 1 }}>
              Create Session
            </Button>
          </div>
        </form>
      </Modal>

      {/* ==================== ADD GOAL MODAL ==================== */}
      <Modal
        isOpen={activeModal === 'goal'}
        onClose={() => setActiveModal(null)}
        title={`Add ${goalType === 'weekly' ? 'Weekly' : 'Monthly'} Goal`}
      >
        <form onSubmit={saveGoal}>
          <FormField label="Goal description" htmlFor="modal-goal-name">
            <input
              id="modal-goal-name"
              type="text"
              placeholder="e.g. Exercise 5 times this week"
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              className="ui-input"
              autoFocus
              required
            />
          </FormField>
          <FormField label="Target (number)" htmlFor="modal-goal-target">
            <input
              id="modal-goal-target"
              type="number"
              placeholder="5"
              min="1"
              value={goalTarget}
              onChange={(e) => setGoalTarget(e.target.value)}
              className="ui-input"
              required
            />
          </FormField>
          <FormField label="Current progress" htmlFor="modal-goal-current">
            <input
              id="modal-goal-current"
              type="number"
              placeholder="0"
              min="0"
              value={goalCurrent}
              onChange={(e) => setGoalCurrent(e.target.value)}
              className="ui-input"
            />
          </FormField>
          <div className="modal-actions" style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <Button type="button" onClick={() => setActiveModal(null)} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" style={{ flex: 1 }}>
              Save Goal
            </Button>
          </div>
        </form>
      </Modal>

      {/* ==================== ADD LIFE GOAL MODAL ==================== */}
      <Modal
        isOpen={activeModal === 'static'}
        onClose={() => setActiveModal(null)}
        title="Add Life Goal"
      >
        <form onSubmit={saveStaticGoal}>
          <FormField label="Goal title" htmlFor="modal-life-goal-name">
            <input
              id="modal-life-goal-name"
              type="text"
              placeholder="e.g. Learn to play piano"
              value={lifeGoalName}
              onChange={(e) => setLifeGoalName(e.target.value)}
              className="ui-input"
              autoFocus
              required
            />
          </FormField>
          <FormField label="Emoji icon" htmlFor="modal-life-goal-emoji">
            <input
              id="modal-life-goal-emoji"
              type="text"
              placeholder="🎯"
              maxLength={2}
              value={lifeGoalEmoji}
              onChange={(e) => setLifeGoalEmoji(e.target.value)}
              className="ui-input"
            />
          </FormField>
          <FormField label="Notes" htmlFor="modal-life-goal-notes">
            <input
              id="modal-life-goal-notes"
              type="text"
              placeholder="Target: Complete basic exercises"
              value={lifeGoalNote}
              onChange={(e) => setLifeGoalNote(e.target.value)}
              className="ui-input"
            />
          </FormField>
          <div className="modal-actions" style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <Button type="button" onClick={() => setActiveModal(null)} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" style={{ flex: 1 }}>
              Save Goal
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

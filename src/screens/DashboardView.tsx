import React, { useState, useEffect, useRef } from 'react';
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
  IconPlayerPlay,
  IconPlayerPause,
  IconPlayerSkipForward,
  IconClock,
  IconLock,
  IconLockOpen,
  IconLink,
  IconRefresh,
  IconArrowLeft,
  IconChevronUp,
  IconPencil,
  IconDotsVertical,
  IconHourglass,
  IconHash,
  IconCircleCheck,
} from '@tabler/icons-react';
import { store } from '../services/db';
import type { AppState, Task, Session, WeeklyGoal, MonthlyGoal, StaticGoal, Step } from '../types';
import TaskItem from '../components/TaskItem';
import AddTaskModal from '../components/AddTaskModal';
import { generateSecureNumericId } from '../utils/taskHelper';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { useTheme } from '../context/ThemeContext';
// Import UI Design System components
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Card from '../components/ui/Card';
import FormField from '../components/ui/FormField';
import Dropdown, { DropdownItem } from '../components/ui/Dropdown';

const PRESETS: { name: string; icon: string; color: string; steps: Step[] }[] = [
  {
    name: 'Morning Routine 🌅',
    icon: '🌅',
    color: 'accent',
    steps: [
      { name: 'Stretch', type: 'timer', dur: '5', done: false },
      { name: 'Pushups', type: 'counter', targetCount: 50, currentCount: 0, done: false },
      { name: 'Mobility Drill', type: 'timer', dur: '10', done: false },
      { name: 'Facial Exercises', type: 'timer', dur: '5', done: false }
    ]
  },
  {
    name: 'Deep Work Focus 🧠',
    icon: '💻',
    color: 'accent',
    steps: [
      { name: 'Desk preparation', type: 'checklist', done: false },
      { name: 'Deep work block', type: 'timer', dur: '45', done: false },
      { name: 'Rest and stretch', type: 'timer', dur: '10', done: false }
    ]
  },
  {
    name: 'Gym Chest Day 🏋️',
    icon: '🏋️',
    color: 'accent',
    steps: [
      { name: 'Warmup cardio', type: 'timer', dur: '10', done: false },
      { name: 'Bench Press', type: 'counter', targetCount: 40, currentCount: 0, done: false },
      { name: 'Incline Dumbbell Flyes', type: 'counter', targetCount: 36, currentCount: 0, done: false },
      { name: 'Cable Crossovers', type: 'counter', targetCount: 45, currentCount: 0, done: false },
      { name: 'Post-workout Stretch', type: 'timer', dur: '5', done: false }
    ]
  },
  {
    name: 'Evening Wind Down 🌙',
    icon: '🌙',
    color: 'accent',
    steps: [
      { name: 'Write diary/journal', type: 'checklist', done: false },
      { name: 'Read a book', type: 'timer', dur: '20', done: false },
      { name: 'Meditation', type: 'timer', dur: '10', done: false }
    ]
  }
];

const ConfettiCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    
    const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#ef4444'];
    const particles = Array.from({ length: 150 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height - height,
      r: Math.random() * 6 + 4,
      d: Math.random() * height,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 5,
      tiltAngleIncremental: Math.random() * 0.07 + 0.02,
      tiltAngle: 0
    }));
    
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      
      particles.forEach((p, idx) => {
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
        p.x += Math.sin(p.tiltAngle);
        p.tilt = Math.sin(p.tiltAngle - idx / 3) * 15;
        
        if (p.y > height) {
          p.x = Math.random() * width;
          p.y = -20;
          p.tilt = Math.random() * 10 - 5;
        }
        
        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        ctx.stroke();
      });
      
      animationFrameId = requestAnimationFrame(draw);
    };
    
    draw();
    
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  return <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 100 }} />;
};

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

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const getTextColorOnBackground = (color: string) => {
    if (!isDark) return '#fff';
    return ['amber', 'green', 'blue', 'pink'].includes(color) ? '#000' : '#fff';
  };

  // Modals state
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'task' | 'session'; id: number | string; name: string } | null>(null);

  const [sessionName, setSessionName] = useState('');
  const [sessionIcon, setSessionIcon] = useState('🏋️');
  const [sessionColor, setSessionColor] = useState('accent');
  const [customSteps, setCustomSteps] = useState<Step[]>([
    { name: 'Stretch', type: 'timer', dur: '5', done: false }
  ]);
  const [editingSessionId, setEditingSessionId] = useState<number | string | null>(null);
  const [sessionToStart, setSessionToStart] = useState<Session | null>(null);
  const [repeatType, setRepeatType] = useState<'daily' | 'weekly'>('daily');
  const [repeatDays, setRepeatDays] = useState<number[]>([1, 2, 3, 4, 5]); // Default to Mon-Fri

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Zen Mode Player State
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(0); // in seconds
  const [elapsedTime, setElapsedTime] = useState<number>(0); // in seconds (for stopwatch)
  const [isDndActive, setIsDndActive] = useState<boolean>(false);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);
  const [wakeLock, setWakeLock] = useState<any>(null);

  const [goalType, setGoalType] = useState<'weekly' | 'monthly'>('weekly');
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState<number | string>(5);
  const [goalCurrent, setGoalCurrent] = useState<number | string>(0);

  const [lifeGoalName, setLifeGoalName] = useState('');
  const [lifeGoalEmoji, setLifeGoalEmoji] = useState('🎯');
  const [lifeGoalNote, setLifeGoalNote] = useState('');

  const colorMap: Record<string, string> = {
    accent: 'var(--accent)',
    green: 'var(--green)',
    amber: 'var(--amber)',
    blue: 'var(--blue)',
    pink: 'var(--pink)',
  };
  const colorBgMap: Record<string, string> = {
    accent: 'var(--accent-bg)',
    green: 'var(--green-bg)',
    amber: 'var(--amber-bg)',
    blue: 'var(--blue-bg)',
    pink: 'var(--pink-bg)',
  };

  // Filter tasks that belong to Today dashboard (no listId or listId is 'toady')
  const getTodayTasks = () => {
    return (state.tasks || []).filter(
      (t) => !t.listId || t.listId === 'toady'
    );
  };

  // Filter sessions scheduled for today
  const getTodaySessions = () => {
    const todayDayOfWeek = new Date().getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    return (state.sessions || []).filter(s => {
      if (!s.repeatType || s.repeatType === 'daily') return true;
      if (s.repeatType === 'weekly' && s.repeatDays) {
        return s.repeatDays.includes(todayDayOfWeek);
      }
      return true;
    });
  };

  // Calculate today score
  const calculateTodayScore = () => {
    const todayTasks = getTodayTasks();
    const todaySessions = getTodaySessions();
    const all = [
      ...todaySessions.flatMap((s) => s.steps || []),
      ...todayTasks,
    ];
    const done = all.filter((x) => x.done).length;
    return all.length ? Math.round((done / all.length) * 100) : 0;
  };

  const score = calculateTodayScore();

  const renderStepsList = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6, fontWeight: 600, display: 'block' }}>
          Routine Steps ({customSteps.length})
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {customSteps.map((step, idx) => (
            <div
              key={idx}
              className="step-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '10px 12px',
                position: 'relative',
                transition: 'all 0.2s',
              }}
            >
              {/* Top Row: Number, Name input, Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 'bold', minWidth: '16px' }}>
                  {idx + 1}
                </span>
                <input
                  type="text"
                  placeholder="Step Name (e.g. Stretch)"
                  value={step.name}
                  onChange={(e) => {
                    const updated = [...customSteps];
                    updated[idx].name = e.target.value;
                    setCustomSteps(updated);
                  }}
                  className="ui-input"
                  style={{
                    flex: 1,
                    height: '32px',
                    fontSize: '12px',
                    padding: '0 8px',
                    background: 'var(--bg2)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: 'var(--text)'
                  }}
                  required
                />

                {/* Reordering & Delete Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => {
                      const updated = [...customSteps];
                      const temp = updated[idx];
                      updated[idx] = updated[idx - 1];
                      updated[idx - 1] = temp;
                      setCustomSteps(updated);
                    }}
                    style={{
                      padding: '4px',
                      opacity: idx === 0 ? 0.2 : 0.6,
                      cursor: idx === 0 ? 'default' : 'pointer',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text)',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <IconChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={idx === customSteps.length - 1}
                    onClick={() => {
                      const updated = [...customSteps];
                      const temp = updated[idx];
                      updated[idx] = updated[idx + 1];
                      updated[idx + 1] = temp;
                      setCustomSteps(updated);
                    }}
                    style={{
                      padding: '4px',
                      opacity: idx === customSteps.length - 1 ? 0.2 : 0.6,
                      cursor: idx === customSteps.length - 1 ? 'default' : 'pointer',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text)',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <IconChevronDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomSteps(customSteps.filter((_, i) => i !== idx));
                    }}
                    style={{
                      padding: '4px',
                      color: '#ef4444',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      opacity: 0.8,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Delete step"
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              </div>

              {/* Segmented Control Row */}
              <div style={{
                display: 'flex',
                background: 'var(--bg4)',
                padding: '2px',
                borderRadius: '6px',
                width: '100%',
                boxSizing: 'border-box'
              }}>
                {[
                  { type: 'timer', label: 'Timer', icon: <IconHourglass size={14} /> },
                  { type: 'counter', label: 'Reps', icon: <IconHash size={14} /> },
                  { type: 'checklist', label: 'Task', icon: <IconCircleCheck size={14} /> }
                ].map(opt => {
                  const isSelected = (step.type || 'timer') === opt.type;
                  return (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => {
                        const updated = [...customSteps];
                        const val = opt.type as 'timer' | 'counter' | 'checklist';
                        updated[idx].type = val;
                        if (val === 'timer') {
                          updated[idx].dur = '5';
                          delete updated[idx].targetCount;
                          delete updated[idx].taskId;
                        } else if (val === 'counter') {
                          updated[idx].targetCount = 50;
                          delete updated[idx].dur;
                          delete updated[idx].taskId;
                        } else {
                          delete updated[idx].dur;
                          delete updated[idx].targetCount;
                        }
                        setCustomSteps(updated);
                      }}
                      style={{
                        flex: 1,
                        padding: '5px 0',
                        borderRadius: '4px',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: isSelected ? colorMap[sessionColor] : 'transparent',
                        color: isSelected ? getTextColorOnBackground(sessionColor) : 'var(--text3)',
                        transition: 'all 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      {opt.icon}
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Type Parameters Block */}
              <div style={{ marginTop: '2px' }}>
                {step.type === 'timer' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', opacity: 0.5 }}>Duration:</span>
                    <input
                      type="number"
                      min="1"
                      max="300"
                      value={step.dur || '5'}
                      onChange={(e) => {
                        const updated = [...customSteps];
                        updated[idx].dur = e.target.value;
                        setCustomSteps(updated);
                      }}
                      className="ui-input"
                      style={{
                        width: '48px',
                        height: '24px',
                        fontSize: '11px',
                        padding: '0 4px',
                        textAlign: 'center',
                        background: 'var(--bg2)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        color: 'var(--text)'
                      }}
                    />
                    <span style={{ fontSize: '11px', opacity: 0.5 }}>min</span>
                    
                    {/* Chips */}
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {['1', '5', '10', '15', '30'].map(durVal => (
                        <button
                          key={durVal}
                          type="button"
                          onClick={() => {
                            const updated = [...customSteps];
                            updated[idx].dur = durVal;
                            setCustomSteps(updated);
                          }}
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: step.dur === durVal ? colorMap[sessionColor] : 'var(--bg2)',
                            color: step.dur === durVal ? getTextColorOnBackground(sessionColor) : 'var(--text2)',
                            border: `1px solid ${step.dur === durVal ? colorMap[sessionColor] : 'var(--border)'}`,
                            cursor: 'pointer',
                            transition: 'all 0.1s'
                          }}
                        >
                          {durVal}m
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {step.type === 'counter' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', opacity: 0.5 }}>Target:</span>
                    <input
                      type="number"
                      min="1"
                      max="9999"
                      value={step.targetCount || 50}
                      onChange={(e) => {
                        const updated = [...customSteps];
                        updated[idx].targetCount = parseInt(e.target.value, 10) || 50;
                        setCustomSteps(updated);
                      }}
                      className="ui-input"
                      style={{
                        width: '52px',
                        height: '24px',
                        fontSize: '11px',
                        padding: '0 4px',
                        textAlign: 'center',
                        background: 'var(--bg2)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        color: 'var(--text)'
                      }}
                    />
                    <span style={{ fontSize: '11px', opacity: 0.5 }}>reps</span>

                    {/* Chips */}
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[10, 20, 50, 100].map(cntVal => (
                        <button
                          key={cntVal}
                          type="button"
                          onClick={() => {
                            const updated = [...customSteps];
                            updated[idx].targetCount = cntVal;
                            setCustomSteps(updated);
                          }}
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: step.targetCount === cntVal ? colorMap[sessionColor] : 'var(--bg2)',
                            color: step.targetCount === cntVal ? getTextColorOnBackground(sessionColor) : 'var(--text2)',
                            border: `1px solid ${step.targetCount === cntVal ? colorMap[sessionColor] : 'var(--border)'}`,
                            cursor: 'pointer',
                            transition: 'all 0.1s'
                          }}
                        >
                          {cntVal}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {step.type === 'checklist' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                    <span style={{ fontSize: '11px', opacity: 0.5, whiteSpace: 'nowrap' }}>Link Task:</span>
                    <select
                      value={step.taskId || ''}
                      onChange={(e) => {
                        const updated = [...customSteps];
                        const selectedTaskId = e.target.value;
                        if (selectedTaskId) {
                          updated[idx].taskId = selectedTaskId;
                          const linkedTask = state.tasks.find(t => String(t.id) === String(selectedTaskId));
                          if (linkedTask && (!step.name || step.name === 'New Step' || step.name === 'Stretch')) {
                            updated[idx].name = linkedTask.name;
                          }
                        } else {
                          delete updated[idx].taskId;
                        }
                        setCustomSteps(updated);
                      }}
                      className="ui-select"
                      style={{
                        flex: 1,
                        height: '26px',
                        fontSize: '11px',
                        padding: '0 8px',
                        background: 'var(--bg2)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        color: 'var(--text)'
                      }}
                    >
                      <option value="">-- Standalone Step (No link) --</option>
                      {(state.tasks || []).filter(t => !t.done).map(t => (
                        <option key={t.id} value={t.id}>
                          {t.starred ? '⭐ ' : ''}{t.name}
                        </option>
                      ))}
                    </select>
                    {step.taskId && <IconLink size={12} style={{ color: colorMap[sessionColor] }} />}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add Step Button */}
        <button
          type="button"
          onClick={() => {
            setCustomSteps([...customSteps, { name: 'New Step', type: 'timer', dur: '5', done: false }]);
          }}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '8px',
            border: `1.5px dashed color-mix(in srgb, ${colorMap[sessionColor]} 25%, transparent)`,
            background: `color-mix(in srgb, ${colorMap[sessionColor]} 3%, transparent)`,
            color: 'var(--text2)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            marginTop: '4px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `color-mix(in srgb, ${colorMap[sessionColor]} 7%, transparent)`;
            e.currentTarget.style.borderColor = `color-mix(in srgb, ${colorMap[sessionColor]} 38%, transparent)`;
            e.currentTarget.style.color = 'var(--text)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = `color-mix(in srgb, ${colorMap[sessionColor]} 3%, transparent)`;
            e.currentTarget.style.borderColor = `color-mix(in srgb, ${colorMap[sessionColor]} 25%, transparent)`;
            e.currentTarget.style.color = 'var(--text2)';
          }}
        >
          <IconPlus size={14} /> Add Step
        </button>
      </div>
    );
  };

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
    const task = state.tasks.find(t => t.id === taskId);
    setItemToDelete({ type: 'task', id: taskId, name: task?.name || 'this task' });
  };

  const handleDeleteSession = (index: number) => {
    const session = state.sessions[index];
    setItemToDelete({ type: 'session', id: index, name: session.name });
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'task') {
      handleGlobalDeleteTask(itemToDelete.id);
    } else {
      const idx = itemToDelete.id as number;
      const sessionToDelete = state.sessions[idx];
      const updated = state.sessions.filter((_, i) => i !== idx);
      const deletedIds = {
        ...(state.deletedIds || {}),
        sessions: [...(state.deletedIds?.sessions || []), sessionToDelete.id],
      };
      store.setState({ sessions: updated, deletedIds });
    }
    setItemToDelete(null);
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

  const handleNewSessionClick = () => {
    setEditingSessionId(null);
    setSessionName('');
    setSessionIcon('🏋️');
    setSessionColor('accent');
    setCustomSteps([{ name: 'Stretch', type: 'timer', dur: '5', done: false }]);
    setRepeatType('daily');
    setRepeatDays([1, 2, 3, 4, 5]);
    setActiveModal('session');
  };

  const handleEditSession = (session: Session) => {
    setEditingSessionId(session.id);
    setSessionName(session.name);
    setSessionIcon(session.icon);
    setSessionColor(session.color);
    setCustomSteps(JSON.parse(JSON.stringify(session.steps)));
    setRepeatType(session.repeatType || 'daily');
    setRepeatDays(session.repeatDays || [1, 2, 3, 4, 5]);
    setActiveModal('session');
  };

  const saveSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionName.trim() || customSteps.length === 0) return;

    if (editingSessionId !== null) {
      const updated = state.sessions.map(s => {
        if (s.id === editingSessionId) {
          return {
            ...s,
            name: sessionName.trim(),
            icon: sessionIcon.trim() || '⚡',
            color: sessionColor,
            steps: customSteps,
            repeatType,
            repeatDays: repeatType === 'weekly' ? repeatDays : undefined
          };
        }
        return s;
      });
      store.setState({ sessions: updated });
    } else {
      const newSession: Session = {
        id: generateSecureNumericId(),
        name: sessionName.trim(),
        icon: sessionIcon.trim() || '⚡',
        color: sessionColor,
        steps: customSteps,
        open: false,
        streak: 0,
        lastCompletedDate: '',
        repeatType,
        repeatDays: repeatType === 'weekly' ? repeatDays : undefined
      };
      store.setState({ sessions: [...state.sessions, newSession] });
    }

    setSessionName('');
    setSessionIcon('🏋️');
    setSessionColor('accent');
    setCustomSteps([{ name: 'Stretch', type: 'timer', dur: '5', done: false }]);
    setRepeatType('daily');
    setRepeatDays([1, 2, 3, 4, 5]);
    setEditingSessionId(null);
    setActiveModal(null);
  };

  // Zen Mode Player Logic
  const startSessionPlay = (session: Session, resume = false) => {
    let sessionToLoad = session;
    let initialIdx = 0;
    
    if (resume) {
      const firstIncompleteIdx = session.steps.findIndex(step => !step.done);
      initialIdx = firstIncompleteIdx !== -1 ? firstIncompleteIdx : 0;
      sessionToLoad = { ...session };
    } else {
      sessionToLoad = {
        ...session,
        steps: session.steps.map(step => ({ ...step, done: false, currentCount: 0 }))
      };
    }
    
    setActiveSession(sessionToLoad);
    setCurrentStepIdx(initialIdx);
    setIsPlaying(true);
    setShowCelebration(false);
    
    const activeStep = sessionToLoad.steps[initialIdx];
    if (activeStep && activeStep.type === 'timer') {
      setTimeLeft(parseInt(activeStep.dur || '5', 10) * 60);
    } else {
      setTimeLeft(0);
    }
    setElapsedTime(0);
  };

  const playChime = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const playNote = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.08, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.start(start);
        osc.stop(start + duration);
      };
      playNote(523.25, ctx.currentTime, 0.25); // C5
      playNote(659.25, ctx.currentTime + 0.1, 0.25); // E5
      playNote(783.99, ctx.currentTime + 0.2, 0.25); // G5
      playNote(1046.50, ctx.currentTime + 0.3, 0.5); // C6
    } catch (e) {
      console.warn('Audio context chime error:', e);
    }
  };

  const handleStepComplete = () => {
    if (!activeSession) return;
    
    playChime();
    const currentStep = activeSession.steps[currentStepIdx];
    
    // Linked Task Sync
    if (currentStep.taskId) {
      handleGlobalToggleTask(currentStep.taskId);
    }
    
    const updatedSteps = [...activeSession.steps];
    updatedSteps[currentStepIdx] = { ...currentStep, done: true };
    const updatedSession = { ...activeSession, steps: updatedSteps };
    setActiveSession(updatedSession);
    
    const nextIdx = currentStepIdx + 1;
    if (nextIdx < activeSession.steps.length) {
      setCurrentStepIdx(nextIdx);
      const nextStep = activeSession.steps[nextIdx];
      if (nextStep.type === 'timer') {
        setTimeLeft(parseInt(nextStep.dur || '5', 10) * 60);
      } else {
        setTimeLeft(0);
      }
      setElapsedTime(0);
      setIsPlaying(true);
    } else {
      // Session finished!
      setIsPlaying(false);
      
      const todayStr = new Date().toDateString();
      const dbSessions = [...state.sessions];
      const sessionIndex = dbSessions.findIndex(s => String(s.id) === String(activeSession.id));
      
      let newStreak = activeSession.streak || 0;
      if (sessionIndex !== -1) {
        const lastSession = dbSessions[sessionIndex];
        const lastDate = lastSession.lastCompletedDate;
        
        if (lastDate) {
          const last = new Date(lastDate);
          const today = new Date(todayStr);
          last.setHours(0,0,0,0);
          today.setHours(0,0,0,0);
          const diffTime = today.getTime() - last.getTime();
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            newStreak = (lastSession.streak || 0) + 1;
          } else if (diffDays > 1) {
            newStreak = 1;
          } else {
            newStreak = lastSession.streak || 1;
          }
        } else {
          newStreak = 1;
        }
        
        dbSessions[sessionIndex] = {
          ...lastSession,
          streak: newStreak,
          lastCompletedDate: todayStr,
          steps: lastSession.steps.map(s => ({ ...s, done: true }))
        };
        store.setState({ sessions: dbSessions });
      }
      
      setActiveSession(prev => prev ? { ...prev, streak: newStreak } : null);
      setShowCelebration(true);
    }
  };

  // Timer/stopwatch tick effect
  useEffect(() => {
    let interval: any = null;
    if (activeSession && isPlaying && !showCelebration) {
      const step = activeSession.steps[currentStepIdx];
      if (step) {
        interval = setInterval(() => {
          if (step.type === 'timer') {
            setTimeLeft(prev => {
              if (prev <= 1) {
                clearInterval(interval);
                handleStepComplete();
                return 0;
              }
              return prev - 1;
            });
          } else {
            setElapsedTime(prev => prev + 1);
          }
        }, 1000);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeSession, isPlaying, currentStepIdx, showCelebration]);

  // Wake Lock & Capacitor DND status bar effect
  useEffect(() => {
    const handleDndChange = async () => {
      try {
        const win = window as any;
        const isNative = !!(win.Capacitor?.isNative);
        const nativeStatusBar = win.Capacitor?.Plugins?.StatusBar;
        
        if (activeSession && isDndActive) {
          if ('wakeLock' in navigator) {
            try {
              const lock = await navigator.wakeLock.request('screen');
              setWakeLock(lock);
            } catch (err) {
              console.warn('Wake Lock request failed:', err);
            }
          }
          if (isNative && nativeStatusBar) {
            await nativeStatusBar.hide();
          }
        } else {
          if (wakeLock) {
            try {
              await wakeLock.release();
            } catch (e) {}
            setWakeLock(null);
          }
          if (isNative && nativeStatusBar) {
            await nativeStatusBar.show();
          }
        }
      } catch (e) {
        console.warn('DND effect failed:', e);
      }
    };
    
    handleDndChange();
    
    return () => {
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, [activeSession, isDndActive]);

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
              {getTodaySessions().length > 0 ? (
                getTodaySessions().map((s: Session) => {
                  const globalIdx = state.sessions.findIndex(sess => sess.id === s.id);
                  const total = s.steps.length;
                  const done = s.steps.filter((x) => x.done).length;
                  const pct = total ? Math.round((done / total) * 100) : 0;
                  const c = colorMap[s.color] || colorMap.accent;
                  const cbg = colorBgMap[s.color] || colorBgMap.accent;
                  const r = 13;
                  const circ = 2 * Math.PI * r;

                  return (
                    <Card
                      key={s.id}
                      padding={false}
                      className={`session-card ${s.open ? 'open' : ''}`}
                    >
                      <div 
                        className="session-head" 
                        onClick={() => setSessionToStart(s)} 
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="session-icon" style={{ background: cbg, color: c }}>
                          {s.icon}
                        </div>
                        <div className="session-meta">
                          <div className="session-name">{s.name}</div>
                          <div className="session-sub">
                            {done}/{total} steps · {pct}% done
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="prog-ring">
                            <svg width="32" height="32" viewBox="0 0 32 32">
                              {s.steps.length > 0 ? (
                                s.steps.map((step, idx) => {
                                  const totalSteps = s.steps.length;
                                  const rotation = -90 + (idx * 360) / totalSteps + (totalSteps > 1 ? 3 : 0);
                                  const strokeColor = step.done ? c : 'rgba(255, 255, 255, 0.1)';
                                  const segmentAngle = (360 / totalSteps) - (totalSteps > 1 ? 6 : 0);
                                  const strokeDash = `${(segmentAngle / 360) * circ} ${circ}`;
                                  return (
                                    <circle
                                      key={idx}
                                      cx="16"
                                      cy="16"
                                      r={r}
                                      stroke={strokeColor}
                                      strokeWidth="3"
                                      fill="none"
                                      strokeDasharray={strokeDash}
                                      transform={`rotate(${rotation} 16 16)`}
                                    />
                                  );
                                })
                              ) : (
                                <circle cx="16" cy="16" r={r} stroke="rgba(255,255,255,0.1)" strokeWidth="3" fill="none" />
                              )}
                            </svg>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTodaySession(globalIdx);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text3)',
                              cursor: 'pointer',
                              padding: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '50%',
                              transition: 'background 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'none';
                            }}
                          >
                            <IconChevronDown size={14} className="session-expand" />
                          </button>
                        </div>
                      </div>
                      <div className="session-body">
                        <div className="step-list">
                          {s.steps.map((step, i) => (
                            <div
                              key={i}
                              className={`step-item ${step.done ? 'done' : ''}`}
                              onClick={() => toggleStep(globalIdx, i)}
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
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px', padding: '0 8px' }}>
                          <Button
                            variant="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              const completed = s.steps.filter((st: Step) => st.done).length;
                              const total = s.steps.length;
                              const isPartial = completed > 0 && completed < total;
                              startSessionPlay(s, isPartial);
                            }}
                            style={{
                              background: 'var(--accent)',
                              color: '#fff',
                              fontWeight: 'bold',
                              padding: '10px 24px',
                              borderRadius: '20px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              width: '100%',
                              justifyContent: 'center',
                              boxShadow: '0 4px 12px rgba(204, 91, 54, 0.25)',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            <IconPlayerPlay size={14} fill="currentColor" />
                            {(() => {
                              const completed = s.steps.filter((st: Step) => st.done).length;
                              const total = s.steps.length;
                              if (total > 0) {
                                if (completed === total) return 'Restart Session';
                                if (completed > 0) return 'Resume Session';
                              }
                              return 'Start Session';
                            })()}
                          </Button>
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
              <Button onClick={handleNewSessionClick} className="add-btn" size="sm">
                <IconPlus size={13} />
                New Session
              </Button>
            </div>

            <div id="sessions-manager" className="space-y-4">
              {state.sessions && state.sessions.length > 0 ? (
                state.sessions.map((s: Session, si) => {
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
                        <div className="sm-actions" style={{ display: 'flex', gap: '6px' }}>
                          <Dropdown
                            align="right"
                            trigger={
                              <button
                                type="button"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--text3)',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: '8px',
                                  borderRadius: '50%',
                                  transition: 'all 0.15s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = 'var(--text)';
                                  e.currentTarget.style.background = 'var(--bg3)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = 'var(--text3)';
                                  e.currentTarget.style.background = 'none';
                                }}
                              >
                                <IconDotsVertical size={16} />
                              </button>
                            }
                          >
                            <DropdownItem onClick={() => handleEditSession(s)}>
                              <IconPencil size={14} />
                              Edit Session
                            </DropdownItem>
                            <DropdownItem variant="danger" onClick={() => handleDeleteSession(si)}>
                              <IconTrash size={14} />
                              Delete Session
                            </DropdownItem>
                          </Dropdown>
                        </div>
                      </div>
                      <div className="sm-steps-preview">
                        {s.steps.map((st: Step, i) => (
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

      {/* ==================== ADD SESSION WINDOW ==================== */}
      {activeModal === 'session' && (
        <>
          <div className="task-detail-backdrop" onClick={() => setActiveModal(null)} />
          <div 
            className="task-detail-overlay" 
            style={{ 
              maxWidth: '820px', 
              width: '100%', 
              height: '100%', 
              maxHeight: '100vh',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 1000
            }}
          >
            {/* Top Bar */}
            <div className="task-detail-topbar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button type="button" className="task-detail-back-btn" onClick={() => setActiveModal(null)}>
                  <IconArrowLeft size={22} />
                </button>
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  {editingSessionId ? "Edit Session" : "New Session"}
                </span>
              </div>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={saveSession} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="task-detail-body" style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
                {!isMobile ? (
                  /* Desktop Layout: Two Column Split */
                  <div style={{ display: 'flex', flex: 1, gap: '24px', overflow: 'hidden', minHeight: 0 }}>
                    {/* Left Column: Identity, Repeat, Presets */}
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '12px' }}>
                      
                      {/* Identity Row */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6, fontWeight: 600 }}>
                          Session Info
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              const EMOJI_POOL = ['🏋️', '🧘', '🚴', '🚿', '📚', '🥦', '💧', '🧠', '☀️', '🌙', '🧹', '🚶', '✍️', '💻', '🔋', '🍎', '💪'];
                              const idx = EMOJI_POOL.indexOf(sessionIcon);
                              const nextIdx = (idx + 1) % EMOJI_POOL.length;
                              setSessionIcon(EMOJI_POOL[nextIdx]);
                            }}
                            style={{
                              width: '52px',
                              height: '52px',
                              borderRadius: '50%',
                              background: colorBgMap[sessionColor] || 'var(--bg3)',
                              border: `2px solid ${colorMap[sessionColor] || 'var(--border)'}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '26px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              flexShrink: 0,
                            }}
                            title="Click to cycle emoji"
                          >
                            {sessionIcon}
                          </button>
                          <div style={{ flex: 1 }}>
                            <input
                              id="modal-session-name-desktop"
                              type="text"
                              placeholder="Session Name"
                              value={sessionName}
                              onChange={(e) => setSessionName(e.target.value)}
                              className="ui-input"
                              style={{
                                fontSize: '15px',
                                fontWeight: '600',
                                background: 'var(--bg3)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                padding: '10px 12px',
                                color: 'var(--text)'
                              }}
                              autoFocus
                              required
                            />
                          </div>
                        </div>
                      </div>

                      {/* Repeatability days */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6, fontWeight: 600 }}>
                          Repeatability
                        </span>
                        <div style={{
                          display: 'flex',
                          background: 'var(--bg3)',
                          padding: '2px',
                          borderRadius: '8px',
                          width: 'fit-content'
                        }}>
                          <button
                            type="button"
                            onClick={() => setRepeatType('daily')}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '6px',
                              border: 'none',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              background: repeatType === 'daily' ? 'var(--bg2)' : 'transparent',
                              color: repeatType === 'daily' ? 'var(--text)' : 'var(--text3)',
                              boxShadow: repeatType === 'daily' ? 'var(--shadow)' : 'none',
                              transition: 'all 0.15s',
                            }}
                          >
                            Daily
                          </button>
                          <button
                            type="button"
                            onClick={() => setRepeatType('weekly')}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '6px',
                              border: 'none',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              background: repeatType === 'weekly' ? 'var(--bg2)' : 'transparent',
                              color: repeatType === 'weekly' ? 'var(--text)' : 'var(--text3)',
                              boxShadow: repeatType === 'weekly' ? 'var(--shadow)' : 'none',
                              transition: 'all 0.15s',
                            }}
                          >
                            Custom Days
                          </button>
                        </div>

                        {repeatType === 'weekly' && (
                          <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                            {[
                              { label: 'M', val: 1 },
                              { label: 'T', val: 2 },
                              { label: 'W', val: 3 },
                              { label: 'T', val: 4 },
                              { label: 'F', val: 5 },
                              { label: 'S', val: 6 },
                              { label: 'S', val: 0 },
                            ].map((day) => {
                              const isSelected = repeatDays.includes(day.val);
                              return (
                                <button
                                  key={day.val}
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      setRepeatDays(repeatDays.filter(d => d !== day.val));
                                    } else {
                                      setRepeatDays([...repeatDays, day.val].sort());
                                    }
                                  }}
                                  style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '6px',
                                    border: `1px solid ${isSelected ? colorMap[sessionColor] : 'var(--border)'}`,
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    background: isSelected ? colorMap[sessionColor] : 'var(--bg3)',
                                    color: isSelected ? getTextColorOnBackground(sessionColor) : 'var(--text2)',
                                    transition: 'all 0.15s',
                                  }}
                                >
                                  {day.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Quick start presets */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6, fontWeight: 600 }}>
                          Presets Quick-Start
                        </span>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {PRESETS.map((preset, pi) => (
                            <button
                              key={pi}
                              type="button"
                              onClick={() => {
                                setSessionName(preset.name.replace(/ \p{Emoji_Presentation}/gu, ''));
                                setSessionIcon(preset.icon);
                                setSessionColor(preset.color);
                                setCustomSteps(JSON.parse(JSON.stringify(preset.steps)));
                              }}
                              style={{
                                padding: '5px 10px',
                                fontSize: '11px',
                                borderRadius: '16px',
                                background: 'var(--bg3)',
                                border: '1px solid var(--border)',
                                cursor: 'pointer',
                                color: 'var(--text2)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.15s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'var(--bg4)';
                                e.currentTarget.style.color = 'var(--text)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'var(--bg3)';
                                e.currentTarget.style.color = 'var(--text2)';
                              }}
                            >
                              <span>{preset.icon}</span>
                              <span>{preset.name.split(' ')[0]}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                    </div>

                    {/* Divider */}
                    <div style={{ width: '1px', background: 'var(--border)', alignSelf: 'stretch' }}></div>

                    {/* Right Column: Steps scroll view */}
                    <div style={{ flex: 1.2, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '12px' }}>
                      {renderStepsList()}
                    </div>
                  </div>
                ) : (
                  /* Mobile Layout: Single Column Scroll list */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Identity Row */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6, fontWeight: 600 }}>
                        Session Info
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            const EMOJI_POOL = ['🏋️', '🧘', '🚴', '🚿', '📚', '🥦', '💧', '🧠', '☀️', '🌙', '🧹', '🚶', '✍️', '💻', '🔋', '🍎', '💪'];
                            const idx = EMOJI_POOL.indexOf(sessionIcon);
                            const nextIdx = (idx + 1) % EMOJI_POOL.length;
                            setSessionIcon(EMOJI_POOL[nextIdx]);
                          }}
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: colorBgMap[sessionColor] || 'var(--bg3)',
                            border: `2px solid ${colorMap[sessionColor] || 'var(--border)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            flexShrink: 0,
                          }}
                          title="Click to cycle emoji"
                        >
                          {sessionIcon}
                        </button>
                        <div style={{ flex: 1 }}>
                          <input
                            id="modal-session-name-mobile"
                            type="text"
                            placeholder="Session Name"
                            value={sessionName}
                            onChange={(e) => setSessionName(e.target.value)}
                            className="ui-input"
                            style={{
                              fontSize: '14px',
                              fontWeight: '600',
                              background: 'var(--bg3)',
                              border: '1px solid var(--border)',
                              borderRadius: '8px',
                              padding: '8px 10px',
                              color: 'var(--text)'
                            }}
                            autoFocus
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Repeatability */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6, fontWeight: 600 }}>
                        Repeatability
                      </span>
                      <div style={{
                        display: 'flex',
                        background: 'var(--bg3)',
                        padding: '2px',
                        borderRadius: '8px',
                        width: 'fit-content'
                      }}>
                        <button
                          type="button"
                          onClick={() => setRepeatType('daily')}
                          style={{
                            padding: '5px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            background: repeatType === 'daily' ? 'var(--bg2)' : 'transparent',
                            color: repeatType === 'daily' ? 'var(--text)' : 'var(--text3)',
                            boxShadow: repeatType === 'daily' ? 'var(--shadow)' : 'none',
                            transition: 'all 0.15s',
                          }}
                        >
                          Daily
                        </button>
                        <button
                          type="button"
                          onClick={() => setRepeatType('weekly')}
                          style={{
                            padding: '5px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            background: repeatType === 'weekly' ? 'var(--bg2)' : 'transparent',
                            color: repeatType === 'weekly' ? 'var(--text)' : 'var(--text3)',
                            boxShadow: repeatType === 'weekly' ? 'var(--shadow)' : 'none',
                            transition: 'all 0.15s',
                          }}
                        >
                          Custom Days
                        </button>
                      </div>

                      {repeatType === 'weekly' && (
                        <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                          {[
                            { label: 'M', val: 1 },
                            { label: 'T', val: 2 },
                            { label: 'W', val: 3 },
                            { label: 'T', val: 4 },
                            { label: 'F', val: 5 },
                            { label: 'S', val: 6 },
                            { label: 'S', val: 0 },
                          ].map((day) => {
                            const isSelected = repeatDays.includes(day.val);
                            return (
                              <button
                                key={day.val}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setRepeatDays(repeatDays.filter(d => d !== day.val));
                                  } else {
                                    setRepeatDays([...repeatDays, day.val].sort());
                                  }
                                }}
                                style={{
                                  width: '26px',
                                  height: '26px',
                                  borderRadius: '6px',
                                  border: `1px solid ${isSelected ? colorMap[sessionColor] : 'var(--border)'}`,
                                  fontSize: '10px',
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                  background: isSelected ? colorMap[sessionColor] : 'var(--bg3)',
                                  color: isSelected ? getTextColorOnBackground(sessionColor) : 'var(--text2)',
                                  transition: 'all 0.15s',
                                }}
                              >
                                {day.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Presets */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6, fontWeight: 600 }}>
                        Presets Quick-Start
                      </span>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {PRESETS.map((preset, pi) => (
                          <button
                            key={pi}
                            type="button"
                            onClick={() => {
                              setSessionName(preset.name.replace(/ \p{Emoji_Presentation}/gu, ''));
                              setSessionIcon(preset.icon);
                              setSessionColor(preset.color);
                              setCustomSteps(JSON.parse(JSON.stringify(preset.steps)));
                            }}
                            style={{
                              padding: '4px 8px',
                              fontSize: '10px',
                              borderRadius: '12px',
                              background: 'var(--bg3)',
                              border: '1px solid var(--border)',
                              cursor: 'pointer',
                              color: 'var(--text2)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <span>{preset.icon}</span>
                            <span>{preset.name.split(' ')[0]}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Steps List */}
                    {renderStepsList()}

                  </div>
                )}
              </div>

              {/* Bottom Action Footer Bar */}
              <div className="task-detail-bottom-bar" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <Button type="button" onClick={() => setActiveModal(null)} style={{ width: isMobile ? 'auto' : '100px', flex: isMobile ? 1 : 'none' }}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" style={{
                  width: isMobile ? 'auto' : '150px',
                  flex: isMobile ? 1.2 : 'none',
                  background: colorMap[sessionColor],
                  color: getTextColorOnBackground(sessionColor),
                  fontWeight: 'bold',
                }}>
                  {editingSessionId ? 'Save Changes' : 'Create Session'}
                </Button>
              </div>
            </form>
          </div>
        </>
      )}

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

      {/* ==================== LAUNCH SESSION MODAL ==================== */}
      <Modal
        isOpen={sessionToStart !== null}
        onClose={() => setSessionToStart(null)}
        className="modal-expand-anim"
        style={{
          background: 'var(--bg2)',
          padding: '24px',
          textAlign: 'center',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border2)'
        }}
      >
        {sessionToStart && (() => {
          const totalSteps = sessionToStart.steps.length;
          const completedSteps = sessionToStart.steps.filter((st: Step) => st.done).length;
          const isPartial = completedSteps > 0 && completedSteps < totalSteps;
          const isAllCompleted = completedSteps === totalSteps && totalSteps > 0;
          
          let statusText = 'Start the Session';
          let descText = 'Kill all the distractions and focus on the task';
          let btnText = 'Start Session';
          
          if (isAllCompleted) {
            statusText = 'Session completed';
            descText = 'You have completed all the steps for this session today!';
            btnText = 'Restart Session';
          } else if (isPartial) {
            statusText = 'Resume the Session';
            descText = `You've completed ${completedSteps}/${totalSteps} steps. Let's finish the rest!`;
            btnText = 'Resume Session';
          }
          
          return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {statusText}
              </span>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', margin: 0 }}>
                {sessionToStart.name}
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text3)', margin: '0 0 8px 0', lineHeight: 1.5 }}>
                {descText}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '8px' }}>
                <Button
                  variant="primary"
                  onClick={() => {
                    const s = sessionToStart;
                    setSessionToStart(null);
                    startSessionPlay(s, isPartial);
                  }}
                  style={{
                    background: 'var(--accent)',
                    color: '#fff',
                    fontWeight: 'bold',
                    padding: '12px 24px',
                    borderRadius: '24px',
                    width: '100%',
                    fontSize: '15px',
                    boxShadow: '0 4px 16px rgba(204, 91, 54, 0.3)',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {btnText}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setSessionToStart(null)}
                  style={{
                    color: 'var(--text3)',
                    padding: '10px',
                    borderRadius: '20px',
                    width: '100%',
                    fontSize: '13px'
                  }}
                >
                  Back
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      <ConfirmationModal
        isOpen={itemToDelete !== null}
        onClose={() => setItemToDelete(null)}
        onConfirm={confirmDelete}
        title={itemToDelete?.type === 'task' ? `Delete ${itemToDelete.name}?` : `Delete "${itemToDelete?.name}"?`}
        confirmLabel="Delete"
      />

      {/* Fullscreen Zen Mode Session Player */}
      {activeSession && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#0d0c14',
          color: '#fff',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          {/* Ambient Glow Background Blobs */}
          <div style={{
            position: 'absolute',
            top: '-10%',
            left: '-10%',
            width: '50%',
            height: '50%',
            borderRadius: '50%',
            background: activeSession.color === 'green' ? 'rgba(74, 222, 128, 0.12)' :
                        activeSession.color === 'blue' ? 'rgba(96, 165, 250, 0.12)' :
                        activeSession.color === 'amber' ? 'rgba(245, 158, 11, 0.12)' :
                        activeSession.color === 'pink' ? 'rgba(232, 121, 249, 0.12)' :
                        'rgba(124, 106, 247, 0.12)',
            filter: 'blur(100px)',
            zIndex: 0,
            pointerEvents: 'none'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-10%',
            right: '-10%',
            width: '55%',
            height: '55%',
            borderRadius: '50%',
            background: activeSession.color === 'green' ? 'rgba(13, 42, 26, 0.3)' :
                        activeSession.color === 'blue' ? 'rgba(13, 31, 58, 0.3)' :
                        activeSession.color === 'amber' ? 'rgba(42, 31, 7, 0.3)' :
                        activeSession.color === 'pink' ? 'rgba(42, 10, 46, 0.3)' :
                        'rgba(30, 26, 58, 0.3)',
            filter: 'blur(120px)',
            zIndex: 0,
            pointerEvents: 'none'
          }} />

          {(() => {
            const currentStep = activeSession.steps[currentStepIdx];
            const totalSteps = activeSession.steps.length;
            const progressPct = totalSteps ? ((currentStepIdx) / totalSteps) * 100 : 0;
            const stepColorHex = colorMap[activeSession.color] || '#7c6af7';
            const stepBgHex = colorBgMap[activeSession.color] || '#1e1a3a';
            const r = 90;
            const circ = 2 * Math.PI * r;
            const totalSecs = currentStep && currentStep.type === 'timer' ? parseInt(currentStep.dur || '5', 10) * 60 : 0;
            const timerPct = totalSecs ? (timeLeft / totalSecs) * 100 : 0;
            const timerOffset = circ - (timerPct / 100) * circ;

            const formatTime = (s: number) => {
              const mins = Math.floor(s / 60);
              const secs = s % 60;
              return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            };

            return (
              <>
                {/* Header bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', zIndex: 10 }}>
                  <button
                    onClick={() => {
                      if (wakeLock) wakeLock.release().catch(() => {});
                      setActiveSession(null);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'rgba(255,255,255,0.06)',
                      border: 'none',
                      color: '#fff',
                      padding: '8px 14px',
                      borderRadius: '16px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: 500
                    }}
                  >
                    <IconArrowLeft size={16} />
                    <span>Exit</span>
                  </button>

                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '10px', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                      {activeSession.icon} {activeSession.name}
                    </span>
                    <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>
                      Step {currentStepIdx + 1} of {totalSteps}
                    </div>
                  </div>

                  <button
                    onClick={() => setIsDndActive(!isDndActive)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: isDndActive ? 'rgba(74, 222, 128, 0.15)' : 'rgba(255,255,255,0.06)',
                      border: '1px solid',
                      borderColor: isDndActive ? '#4ade80' : 'transparent',
                      color: isDndActive ? '#4ade80' : '#fff',
                      padding: '8px 14px',
                      borderRadius: '16px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      boxShadow: isDndActive ? '0 0 10px rgba(74, 222, 128, 0.15)' : 'none',
                    }}
                  >
                    {isDndActive ? <IconLock size={14} /> : <IconLockOpen size={14} />}
                    <span>Focus DND {isDndActive ? 'ON' : 'OFF'}</span>
                  </button>
                </div>

                {/* Progress bar line */}
                <div style={{ height: '3px', background: 'rgba(255,255,255,0.08)', width: '100%', zIndex: 10 }}>
                  <div style={{ height: '100%', background: stepColorHex, width: `${progressPct}%`, transition: 'width 0.3s ease' }} />
                </div>

                {/* Player body center area */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 10 }}>
                  {currentStep && (
                    <div style={{ width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                      {/* DND focus mode active badge */}
                      {isDndActive && (
                        <div style={{
                          marginBottom: '20px',
                          background: 'rgba(74,222,128,0.08)',
                          border: '1px solid rgba(74,222,128,0.2)',
                          borderRadius: '12px',
                          padding: '6px 12px',
                          fontSize: '11px',
                          color: '#4ade80',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          animation: 'pulse 2s infinite'
                        }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }} />
                          <span>Focus Shield Active (DND & Screen Keep-On)</span>
                        </div>
                      )}

                      <h2 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                        {currentStep.name}
                      </h2>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '32px' }}>
                        <span style={{
                          fontSize: '9px',
                          textTransform: 'uppercase',
                          padding: '3px 8px',
                          borderRadius: '10px',
                          background: 'rgba(255,255,255,0.08)',
                          fontWeight: 700,
                          letterSpacing: '0.05em',
                          opacity: 0.8,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {currentStep.type === 'timer' && (
                            <>
                              <IconHourglass size={10} />
                              <span>Timer</span>
                            </>
                          )}
                          {currentStep.type === 'counter' && (
                            <>
                              <IconHash size={10} />
                              <span>Reps</span>
                            </>
                          )}
                          {currentStep.type === 'checklist' && (
                            <>
                              <IconCircleCheck size={10} />
                              <span>Task</span>
                            </>
                          )}
                        </span>
                        {currentStep.taskId && (
                          <span style={{ fontSize: '9px', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '2px', background: 'rgba(96,165,250,0.1)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                            <IconLink size={10} /> Linked Task
                          </span>
                        )}
                      </div>

                      {/* Adaptive step center UI element */}
                      {currentStep.type === 'timer' && (
                        <div style={{ position: 'relative', width: '220px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px' }}>
                          <svg width="220" height="220" style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}>
                            <circle cx="110" cy="110" r={r} stroke="rgba(255,255,255,0.04)" strokeWidth="6" fill="none" />
                            <circle
                              cx="110"
                              cy="110"
                              r={r}
                              stroke={stepColorHex}
                              strokeWidth="8"
                              fill="none"
                              strokeDasharray={circ}
                              strokeDashoffset={timerOffset}
                              strokeLinecap="round"
                              style={{ transition: 'stroke-dashoffset 0.5s linear' }}
                            />
                          </svg>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '42px', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
                              {formatTime(timeLeft)}
                            </span>
                            <span style={{ fontSize: '11px', opacity: 0.5, marginTop: '2px' }}>
                              of {currentStep.dur} mins
                            </span>
                          </div>
                        </div>
                      )}

                      {currentStep.type === 'counter' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px', width: '100%' }}>
                          <div style={{
                            width: '180px',
                            height: '180px',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.02)',
                            border: `3px solid ${stepColorHex}`,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: `0 4px 20px ${stepBgHex}`,
                            marginBottom: '24px'
                          }}>
                            <span style={{ fontSize: '48px', fontWeight: 800 }}>
                              {currentStep.currentCount || 0}
                            </span>
                            <span style={{ fontSize: '11px', opacity: 0.5, borderTop: '1px solid rgba(255,255,255,0.1)', padding: '4px 12px 0 12px', marginTop: '4px' }}>
                              Target: {currentStep.targetCount || 50}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '12px', width: '100%', justifyContent: 'center' }}>
                            <button
                              onClick={() => {
                                const updated = { ...activeSession };
                                const st = updated.steps[currentStepIdx];
                                st.currentCount = Math.max(0, (st.currentCount || 0) - 1);
                                setActiveSession(updated);
                              }}
                              style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                background: 'rgba(255,255,255,0.05)',
                                border: 'none',
                                color: '#fff',
                                fontSize: '16px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              -1
                            </button>
                            <button
                              onClick={() => {
                                const updated = { ...activeSession };
                                const st = updated.steps[currentStepIdx];
                                st.currentCount = (st.currentCount || 0) + 1;
                                if (st.currentCount >= (st.targetCount || 50)) {
                                  st.done = true;
                                }
                                setActiveSession(updated);
                              }}
                              style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                background: stepColorHex,
                                border: 'none',
                                color: '#fff',
                                fontSize: '22px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: `0 4px 12px color-mix(in srgb, ${stepColorHex} 25%, transparent)`
                              }}
                            >
                              +1
                            </button>
                            <button
                              onClick={() => {
                                const updated = { ...activeSession };
                                const st = updated.steps[currentStepIdx];
                                st.currentCount = (st.currentCount || 0) + 10;
                                if (st.currentCount >= (st.targetCount || 50)) {
                                  st.done = true;
                                }
                                setActiveSession(updated);
                              }}
                              style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                background: 'rgba(255,255,255,0.08)',
                                border: 'none',
                                color: '#fff',
                                fontSize: '13px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              +10
                            </button>
                          </div>
                          
                          <div style={{ marginTop: '16px', fontSize: '11px', opacity: 0.5, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <IconClock size={12} />
                            <span>Stopwatch: {Math.floor(elapsedTime / 60)}m {elapsedTime % 60}s</span>
                          </div>
                        </div>
                      )}

                      {currentStep.type === 'checklist' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px', width: '100%' }}>
                          <button
                            onClick={handleStepComplete}
                            style={{
                              width: '150px',
                              height: '150px',
                              borderRadius: '50%',
                              background: 'rgba(255,255,255,0.02)',
                              border: `3px dashed ${stepColorHex}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: stepColorHex,
                              transition: 'all 0.2s',
                              marginBottom: '20px'
                            }}
                            onMouseEnter={(e) => {
                               e.currentTarget.style.background = `color-mix(in srgb, ${stepColorHex} 3%, transparent)`;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                            }}
                          >
                            <IconCheck size={60} strokeWidth={2} />
                          </button>
                          <div style={{ fontSize: '13px', opacity: 0.6, fontWeight: 500 }}>
                            Tap to Complete Step
                          </div>
                          
                          <div style={{ marginTop: '16px', fontSize: '11px', opacity: 0.5, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <IconClock size={12} />
                            <span>Stopwatch: {Math.floor(elapsedTime / 60)}m {elapsedTime % 60}s</span>
                          </div>
                        </div>
                      )}

                      {/* Control buttons */}
                      <div style={{ display: 'flex', gap: '12px', width: '100%', justifyContent: 'center', marginTop: '12px' }}>
                        {currentStep.type === 'timer' && (
                          <>
                            <button
                              onClick={() => {
                                const total = parseInt(currentStep.dur || '5', 10) * 60;
                                setTimeLeft(total);
                              }}
                              style={{
                                padding: '8px 16px',
                                borderRadius: '18px',
                                background: 'rgba(255,255,255,0.05)',
                                border: 'none',
                                color: '#fff',
                                fontSize: '12px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <IconRefresh size={14} /> Reset
                            </button>
                            <button
                              onClick={() => setIsPlaying(!isPlaying)}
                              style={{
                                padding: '8px 20px',
                                borderRadius: '18px',
                                background: isPlaying ? 'rgba(255,255,255,0.08)' : stepColorHex,
                                border: 'none',
                                color: '#fff',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              {isPlaying ? <IconPlayerPause size={14} fill="currentColor" /> : <IconPlayerPlay size={14} fill="currentColor" />}
                              <span>{isPlaying ? 'Pause' : 'Resume'}</span>
                            </button>
                          </>
                        )}

                        <button
                          onClick={handleStepComplete}
                          style={{
                            padding: '8px 20px',
                            borderRadius: '18px',
                            background: currentStep.type === 'timer' ? 'rgba(255,255,255,0.05)' : stepColorHex,
                            border: 'none',
                            color: '#fff',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span>Skip/Next</span>
                          <IconPlayerSkipForward size={14} fill="currentColor" />
                        </button>
                      </div>

                    </div>
                  )}
                </div>

                {/* Bottom Up-Next banner */}
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                  backdropFilter: 'blur(10px)',
                  padding: '14px 20px',
                  zIndex: 10,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  {currentStepIdx + 1 < totalSteps ? (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '9px', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Up Next</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>
                          {activeSession.steps[currentStepIdx + 1].name}
                        </span>
                      </div>
                      <div style={{
                        fontSize: '10px',
                        opacity: 0.7,
                        background: 'rgba(255,255,255,0.06)',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {activeSession.steps[currentStepIdx + 1].type === 'timer' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <IconHourglass size={12} />
                            <span>{activeSession.steps[currentStepIdx + 1].dur}m</span>
                          </span>
                        )}
                        {activeSession.steps[currentStepIdx + 1].type === 'counter' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <IconHash size={12} />
                            <span>{activeSession.steps[currentStepIdx + 1].targetCount} reps</span>
                          </span>
                        )}
                        {activeSession.steps[currentStepIdx + 1].type === 'checklist' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <IconCircleCheck size={12} />
                            <span>Task</span>
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div style={{ width: '100%', textAlign: 'center', fontSize: '12px', opacity: 0.5, fontWeight: 500 }}>
                      🏁 Final routine activity block
                    </div>
                  )}
                </div>
              </>
            );
          })()}

          {/* Fullscreen Celebration overlay */}
          {showCelebration && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: '#0c0b11',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              textAlign: 'center',
              color: '#fff'
            }}>
              <ConfettiCanvas />
              
              <div style={{ zIndex: 110, display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '340px' }}>
                <div style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '2px solid #f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '44px',
                  marginBottom: '24px',
                  boxShadow: '0 0 30px rgba(245,158,11,0.2)',
                }}>
                  🔥
                </div>
                
                <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.03em', background: 'linear-gradient(to right, #f59e0b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {activeSession.streak || 1}-Day Streak!
                </h1>
                
                <p style={{ fontSize: '14px', opacity: 0.8, margin: '0 0 32px 0', lineHeight: 1.5 }}>
                  Fantastic job completing your <strong>{activeSession.name}</strong> ritual today. You are building strong, persistent habits!
                </p>

                <Card style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', padding: '16px', width: '100%', marginBottom: '32px' }}>
                  <div style={{ fontSize: '10px', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Ritual Summary</div>
                  <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '12px' }}>
                    <div>
                      <div style={{ fontSize: '20px', fontWeight: 700 }}>{activeSession.steps.length}</div>
                      <div style={{ fontSize: '9px', opacity: 0.5, marginTop: '2px' }}>Steps Done</div>
                    </div>
                    <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                    <div>
                      <div style={{ fontSize: '20px', fontWeight: 700 }}>100%</div>
                      <div style={{ fontSize: '9px', opacity: 0.5, marginTop: '2px' }}>Completed</div>
                    </div>
                  </div>
                </Card>

                <Button
                  variant="primary"
                  onClick={() => {
                    if (wakeLock) wakeLock.release().catch(() => {});
                    setActiveSession(null);
                    setShowCelebration(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '24px',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    background: 'linear-gradient(to right, #7c6af7, #60a5fa)',
                    border: 'none',
                    boxShadow: '0 4px 15px rgba(124, 106, 247, 0.4)'
                  }}
                >
                  Back to Dashboard
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

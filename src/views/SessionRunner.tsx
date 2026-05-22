import { useState, useEffect, useRef, type CSSProperties } from 'react';
import {
  IconPlayerPlay,
  IconPlayerPause,
  IconArrowRight,
  IconX,
  IconVolume,
  IconVolumeOff,
  IconConfetti,
} from '@tabler/icons-react';
import { playChime } from '../services/sound';
import { store } from '../services/db';
import type { AppState } from '../types';

/* ─── helpers ─── */
const parseDuration = (str: string) => {
  if (!str) return 60;
  const s = str.toLowerCase().trim();
  if (s.includes('min')) return Math.round(parseFloat(s) * 60);
  if (s.includes('s')) return parseInt(s) || 60;
  return parseInt(s) || 60;
};

const fmt = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

/* ─── Circular ring ─── */
interface RingTimerProps {
  timeLeft: number;
  total: number;
}

function RingTimer({ timeLeft, total }: RingTimerProps) {
  const R = 54;
  const circ = 2 * Math.PI * R;
  const pct = total > 0 ? timeLeft / total : 0;
  const dash = circ * pct;

  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      {/* track */}
      <circle cx="70" cy="70" r={R} fill="none" stroke="var(--bg4)" strokeWidth="8" />
      {/* fill */}
      <circle
        cx="70"
        cy="70"
        r={R}
        fill="none"
        stroke="url(#ringGrad)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        transform="rotate(-90 70 70)"
        style={{ transition: 'stroke-dasharray 0.9s linear' }}
      />
      <defs>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--accent2)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ─── main ─── */
interface SessionRunnerProps {
  state: AppState;
  sessionIndex: number;
  onClose: () => void;
}

export default function SessionRunner({ state, sessionIndex, onClose }: SessionRunnerProps) {
  const session = state.sessions[sessionIndex];

  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [totalSecs, setTotalSecs] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFinished, setIsFinished] = useState(false);

  const intervalRef = useRef<any>(null);
  const timeLeftRef = useRef(0);
  const isRunningRef = useRef(false);

  const step = session?.steps?.[currentStepIdx];

  /* ── init / step change ── */
  useEffect(() => {
    if (!step) return;
    const secs = parseDuration(step.dur);
    setTotalSecs(secs);
    setTimeLeft(secs);
    timeLeftRef.current = secs;
    setIsRunning(true);
    isRunningRef.current = true;
  }, [currentStepIdx, step]);

  /* ── stable interval ── */
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      if (timeLeftRef.current <= 1) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setTimeLeft(0);
        timeLeftRef.current = 0;
        advanceStep();
      } else {
        timeLeftRef.current -= 1;
        setTimeLeft(timeLeftRef.current);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  /* ── keep ref in sync when user pauses/resumes ── */
  const togglePause = () => {
    setIsRunning((r) => {
      isRunningRef.current = !r;
      return !r;
    });
  };

  const advanceStep = () => {
    if (soundEnabled) playChime();

    // mark step done in store
    const updatedSessions = [...state.sessions];
    updatedSessions[sessionIndex].steps[currentStepIdx].done = true;
    store.setState({ sessions: updatedSessions });

    if (currentStepIdx < session.steps.length - 1) {
      setCurrentStepIdx((prev) => prev + 1);
    } else {
      setIsRunning(false);
      isRunningRef.current = false;
      setIsFinished(true);
    }
  };

  const handleSkip = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    advanceStep();
  };

  if (!session) return null;

  /* ── overlay style ── */
  const overlay: CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    background: 'var(--bg)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-sans)',
    padding: '24px 20px',
    animation: 'runnerFadeIn 0.3s ease both',
  };

  const card: CSSProperties = {
    width: '100%',
    maxWidth: 400,
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  };

  /* ─── FINISHED SCREEN ─── */
  if (isFinished) {
    return (
      <div style={overlay}>
        <style>{`
          @keyframes runnerFadeIn { from { opacity:0; transform:scale(0.96) } to { opacity:1; transform:scale(1) } }
          @keyframes confettiBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        `}</style>
        <div style={{ ...card, alignItems: 'center', textAlign: 'center', gap: '16px' }}>
          <div style={{ animation: 'confettiBounce 1s ease infinite' }}>
            <IconConfetti size={64} color="var(--green)" />
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 700,
              color: 'var(--text)',
              letterSpacing: '-0.5px',
              fontFamily: 'var(--font-serif)',
            }}
          >
            Session Complete!
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: 'var(--text2)',
              lineHeight: 1.6,
              maxWidth: 300,
            }}
          >
            Amazing work. You've completed all {session.steps.length} steps of "{session.name}".
          </p>
          <button
            onClick={onClose}
            style={{
              marginTop: 8,
              padding: '14px 48px',
              background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
              border: 'none',
              borderRadius: 14,
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(204,91,54,0.15)',
            }}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  if (!step) return null;

  /* ─── RUNNING SCREEN ─── */
  return (
    <div style={overlay}>
      <style>{`
        @keyframes runnerFadeIn { from { opacity:0; transform:scale(0.96) } to { opacity:1; transform:scale(1) } }
        .runner-ctrl-btn:hover { background: var(--bg4) !important; color: var(--text) !important; }
        .runner-pause-btn:hover { background: var(--accent-bg) !important; filter: brightness(0.95); }
        .runner-skip-btn:hover { background: var(--bg4) !important; color: var(--text) !important; }
      `}</style>

      <div style={card}>
        {/* ── Top bar ── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 32,
          }}
        >
          <span
            style={{
              fontSize: 13,
              color: 'var(--text3)',
              fontWeight: 500,
              letterSpacing: 0.5,
            }}
          >
            STEP {currentStepIdx + 1} OF {session.steps.length}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="runner-ctrl-btn"
              onClick={() => setSoundEnabled((v) => !v)}
              title={soundEnabled ? 'Mute chime' : 'Unmute chime'}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                color: 'var(--text2)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s',
                padding: 0,
              }}
            >
              {soundEnabled ? <IconVolume size={15} /> : <IconVolumeOff size={15} />}
            </button>
            <button
              className="runner-ctrl-btn"
              onClick={onClose}
              title="Exit session"
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                color: 'var(--red)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s',
                padding: 0,
              }}
            >
              <IconX size={15} />
            </button>
          </div>
        </div>

        {/* ── Session & Step name ── */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              fontSize: 12,
              color: 'var(--text3)',
              fontWeight: 600,
              letterSpacing: 1,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            {session.name}
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--text)',
              letterSpacing: '-0.3px',
              fontFamily: 'var(--font-serif)',
            }}
          >
            {step.name}
          </h2>
        </div>

        {/* ── Ring Timer ── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            marginBottom: 32,
          }}
        >
          <RingTimer timeLeft={timeLeft} total={totalSecs} />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontSize: 34,
                fontWeight: 700,
                color: 'var(--text)',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '-1px',
              }}
            >
              {fmt(timeLeft)}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
              {isRunning ? 'running' : 'paused'}
            </span>
          </div>
        </div>

        {/* ── Controls ── */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 32 }}>
          <button
            className="runner-pause-btn"
            onClick={togglePause}
            style={{
              flex: 1,
              padding: '13px 0',
              background: 'var(--accent-bg)',
              border: '1px solid var(--accent2)',
              borderRadius: 14,
              color: 'var(--accent)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'background 0.15s',
              fontFamily: 'inherit',
            }}
          >
            {isRunning ? (
              <>
                <IconPlayerPause size={17} /> Pause
              </>
            ) : (
              <>
                <IconPlayerPlay size={17} /> Resume
              </>
            )}
          </button>
          <button
            className="runner-skip-btn"
            onClick={handleSkip}
            style={{
              flex: 1,
              padding: '13px 0',
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              color: 'var(--text2)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'background 0.15s',
              fontFamily: 'inherit',
            }}
          >
            Skip <IconArrowRight size={16} />
          </button>
        </div>

        {/* ── Step dots ── */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
          {session.steps.map((s, idx) => (
            <div
              key={idx}
              style={{
                width: idx === currentStepIdx ? 20 : 8,
                height: 8,
                borderRadius: 4,
                background: s.done
                  ? 'var(--green)'
                  : idx === currentStepIdx
                  ? 'linear-gradient(90deg, var(--accent), var(--accent2))'
                  : 'var(--bg4)',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

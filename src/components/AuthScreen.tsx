import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../services/supabase';
import {
  IconMail,
  IconLock,
  IconEye,
  IconEyeOff,
  IconLoader2,
  IconSparkles,
  IconAlertCircle,
  IconCheck,
} from '@tabler/icons-react';

/* ─── tiny helpers ─────────────────────────────────────────── */
interface AlertProps {
  type: 'error' | 'success';
  msg: string;
}

function Alert({ type, msg }: AlertProps) {
  if (!msg) return null;
  const styles = {
    error: { bg: 'var(--red-bg)', border: 'var(--red)', color: 'var(--red)' },
    success: { bg: 'var(--green-bg)', border: 'var(--green)', color: 'var(--green)' },
  };
  const s = styles[type];
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        background: s.bg,
        border: `1px solid ${s.border}20`,
        borderRadius: 10,
        padding: '10px 14px',
        fontSize: 13,
        color: s.color,
        marginBottom: 16,
      }}
    >
      {type === 'error' ? (
        <IconAlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
      ) : (
        <IconCheck size={16} style={{ flexShrink: 0, marginTop: 1 }} />
      )}
      <span>{msg}</span>
    </div>
  );
}

interface PasswordInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  autoComplete?: string;
  id?: string;
}

function PasswordInput({ value, onChange, placeholder, autoComplete, id }: PasswordInputProps) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <IconLock
        size={16}
        style={{
          position: 'absolute',
          left: 14,
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--text3)',
        }}
      />
      <input
        id={id}
        type={show ? 'text' : 'password'}
        placeholder={placeholder || '••••••••'}
        value={value}
        onChange={onChange}
        required
        autoComplete={autoComplete || 'current-password'}
        style={{
          width: '100%',
          background: 'var(--bg3)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          color: 'var(--text)',
          fontSize: 14,
          padding: '11px 42px',
          outline: 'none',
          boxSizing: 'border-box',
          fontFamily: 'inherit',
          transition: 'border-color 0.2s',
        }}
        onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
        onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        style={{
          position: 'absolute',
          right: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          color: 'var(--text3)',
          cursor: 'pointer',
          display: 'flex',
          padding: 4,
        }}
      >
        {show ? <IconEyeOff size={16} /> : <IconEye size={16} />}
      </button>
    </div>
  );
}

/* ─── main component ────────────────────────────────────────── */
export default function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const orbitRef = useRef<HTMLDivElement>(null);

  // Subtle parallax on mouse move for the glow orbs
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!orbitRef.current) return;
      const x = (e.clientX / window.innerWidth - 0.5) * 30;
      const y = (e.clientY / window.innerHeight - 0.5) * 30;
      orbitRef.current.style.transform = `translate(${x}px, ${y}px)`;
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  const clearMsgs = () => {
    setError('');
    setSuccess('');
  };

  /* ── Google OAuth ── */
  const handleGoogle = async () => {
    if (!supabase) return setError('Supabase is not configured.');
    setGoogleLoading(true);
    clearMsgs();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: { access_type: 'offline', prompt: 'select_account' },
      },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  };

  /* ── Email Sign In ── */
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return setError('Supabase is not configured.');
    clearMsgs();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ── Email Sign Up ── */
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return setError('Supabase is not configured.');
    clearMsgs();
    if (password !== confirmPassword) return setError('Passwords do not match.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (data.session) {
        // Email confirmation disabled — user is logged in immediately
      } else {
        setSuccess('Account created! Check your inbox to verify your email, then sign in.');
        setMode('signin');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isSignIn = mode === 'signin';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-sans)',
        overflow: 'hidden',
      }}
    >
      {/* ── Background ambient glows ── */}
      <div
        ref={orbitRef}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          transition: 'transform 0.15s ease-out',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '15%',
            left: '20%',
            width: 380,
            height: 380,
            borderRadius: '50%',
            background: 'radial-gradient(circle, var(--accent-bg) 0%, transparent 70%)',
            filter: 'blur(40px)',
            opacity: 0.6,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            right: '15%',
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'radial-gradient(circle, var(--accent-bg) 0%, transparent 70%)',
            filter: 'blur(50px)',
            opacity: 0.4,
          }}
        />
      </div>

      {/* ── Card ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 420,
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: '36px 36px 32px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.06)',
          animation: 'authFadeIn 0.5s cubic-bezier(.16,1,.3,1) both',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 52,
              height: 52,
              background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
              borderRadius: 14,
              margin: '0 auto 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(204,91,54,0.15)',
            }}
          >
            <IconSparkles size={26} color="#fff" />
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--text)',
              letterSpacing: '-0.5px',
              fontFamily: 'var(--font-serif)',
            }}
          >
            The System
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text2)' }}>
            {isSignIn ? 'Welcome back. Sign in to continue.' : 'Create your account to get started.'}
          </p>
        </div>

        {/* Mode tabs */}
        <div
          style={{
            display: 'flex',
            background: 'var(--bg3)',
            borderRadius: 12,
            padding: 4,
            marginBottom: 24,
            border: '1px solid var(--border)',
          }}
        >
          {(['signin', 'signup'] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                clearMsgs();
              }}
              style={{
                flex: 1,
                padding: '8px 0',
                borderRadius: 9,
                border: 'none',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
                background: mode === m ? 'var(--accent)' : 'transparent',
                color: mode === m ? '#fff' : 'var(--text2)',
                boxShadow: mode === m ? '0 2px 8px rgba(204,91,54,0.2)' : 'none',
              }}
            >
              {m === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Alerts */}
        <Alert type="error" msg={error} />
        <Alert type="success" msg={success} />

        {/* Google Button */}
        <button
          id="auth-google-btn"
          onClick={handleGoogle}
          disabled={googleLoading || loading}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: 'var(--bg3)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            color: 'var(--text)',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            transition: 'all 0.2s',
            fontFamily: 'inherit',
            marginBottom: 20,
            boxSizing: 'border-box',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg4)';
            e.currentTarget.style.borderColor = 'var(--border2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--bg3)';
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
        >
          {googleLoading ? (
            <IconLoader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          Continue with Google
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
            or with email
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {/* Email / Password form */}
        <form
          onSubmit={isSignIn ? handleSignIn : handleSignUp}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          {/* Email */}
          <div style={{ position: 'relative' }}>
            <IconMail
              size={16}
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text3)',
              }}
            />
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              id="auth-email"
              name="email"
              autoComplete="email"
              style={{
                width: '100%',
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                color: 'var(--text)',
                fontSize: 14,
                padding: '11px 14px 11px 42px',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          {/* Password */}
          <PasswordInput
            id="auth-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isSignIn ? 'current-password' : 'new-password'}
          />

          {/* Confirm password (sign up only) */}
          {!isSignIn && (
            <PasswordInput
              id="auth-confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              autoComplete="new-password"
            />
          )}

          {/* Submit */}
          <button
            id="auth-submit-btn"
            type="submit"
            disabled={loading || googleLoading}
            style={{
              width: '100%',
              marginTop: 4,
              padding: '12px',
              background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
              border: 'none',
              borderRadius: 12,
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontFamily: 'inherit',
              transition: 'all 0.2s',
              boxSizing: 'border-box',
              opacity: loading || googleLoading ? 0.7 : 1,
              boxShadow: '0 4px 16px rgba(204,91,54,0.2)',
            }}
            onMouseEnter={(e) => {
              if (!loading && !googleLoading) e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {loading ? (
              <IconLoader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            ) : isSignIn ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Footer note */}
        <p
          style={{
            textAlign: 'center',
            fontSize: 12,
            color: 'var(--text3)',
            marginTop: 20,
            marginBottom: 0,
          }}
        >
          Your data is encrypted and synced privately to your account.
        </p>
      </div>

      {/* Keyframe styles */}
      <style>{`
        @keyframes authFadeIn {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export function LoadingSplash() {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#0a0a0d',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', system-ui, sans-serif",
      gap: 16,
      zIndex: 9999
    }}>
      {/* Logo mark */}
      <div style={{
        width: 52, height: 52,
        background: 'linear-gradient(135deg, #7c6af7, #a594ff)',
        borderRadius: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(124,106,247,0.4)',
        animation: 'splashPulse 1.8s ease-in-out infinite',
      }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
        </svg>
      </div>
      <div style={{ fontSize: 13, color: '#3a3a45', letterSpacing: 1 }}>Loading…</div>
      <style>{`
        @keyframes splashPulse {
          0%, 100% { box-shadow: 0 8px 24px rgba(124,106,247,0.4); transform: scale(1); }
          50% { box-shadow: 0 8px 36px rgba(124,106,247,0.7); transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}

export default LoadingSplash;

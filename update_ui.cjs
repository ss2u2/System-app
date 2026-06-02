const fs = require('fs');

const path = 'src/screens/DashboardView.tsx';
let code = fs.readFileSync(path, 'utf8');

// Normalize newlines for easier matching
const normalizedCode = code.replace(/\r\n/g, '\n');

const startStr = '      {/* Fullscreen Zen Mode Session Player */}';
const endStr = '    </div>\n  );\n}';

const startIdx = normalizedCode.indexOf(startStr);
const endIdx = normalizedCode.lastIndexOf(endStr);

if (startIdx === -1 || endIdx === -1) {
  console.log('Failed to find indices');
  console.log('startIdx:', startIdx, 'endIdx:', endIdx);
  process.exit(1);
}

const newZenPlayer = `      {/* Fullscreen Zen Mode Session Player */}
      {activeSession && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#ffffff',
          color: '#111827',
          fontFamily: 'ui-rounded, "Nunito", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          {(() => {
            const currentStep = activeSession.steps[currentStepIdx];
            const totalSteps = activeSession.steps.length;
            const progressPct = totalSteps ? ((currentStepIdx) / totalSteps) * 100 : 0;
            const stepColorHex = colorMap[activeSession.color] || '#7c6af7';
            const stepBgHex = colorBgMap[activeSession.color] || '#f3f4f6';
            const r = 90;
            const circ = 2 * Math.PI * r;
            const totalSecs = currentStep && currentStep.type === 'timer' ? parseInt(currentStep.dur || '5', 10) * 60 : 0;
            const timerPct = totalSecs ? (timeLeft / totalSecs) * 100 : 0;
            const timerOffset = circ - (timerPct / 100) * circ;

            const formatTime = (s) => {
              const mins = Math.floor(s / 60);
              const secs = s % 60;
              return \`\${String(mins).padStart(2, '0')}:\${String(secs).padStart(2, '0')}\`;
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
                      background: 'rgba(0,0,0,0.04)',
                      border: 'none',
                      color: '#111827',
                      padding: '8px 14px',
                      borderRadius: '16px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      transition: 'background 0.2s'
                    }}
                  >
                    <IconArrowLeft size={16} />
                    <span>Exit</span>
                  </button>

                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '10px', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                      {activeSession.icon} {activeSession.name}
                    </span>
                    <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '2px' }}>
                      Step {currentStepIdx + 1} of {totalSteps}
                    </div>
                  </div>

                  <button
                    onClick={() => setIsDndActive(!isDndActive)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: isDndActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0,0,0,0.04)',
                      border: '1px solid',
                      borderColor: isDndActive ? '#10b981' : 'transparent',
                      color: isDndActive ? '#10b981' : '#111827',
                      padding: '8px 14px',
                      borderRadius: '16px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      transition: 'all 0.2s'
                    }}
                  >
                    {isDndActive ? <IconLock size={14} /> : <IconLockOpen size={14} />}
                    <span>Focus DND {isDndActive ? 'ON' : 'OFF'}</span>
                  </button>
                </div>

                {/* Progress bar line */}
                <div style={{ height: '3px', background: 'rgba(0,0,0,0.05)', width: '100%', zIndex: 10 }}>
                  <div style={{ height: '100%', background: stepColorHex, width: \`\${progressPct}%\`, transition: 'width 0.3s ease' }} />
                </div>

                {/* Player body center area */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 10 }}>
                  {currentStep && (
                    <div style={{ width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                      {/* DND focus mode active badge */}
                      {isDndActive && (
                        <div style={{
                          marginBottom: '20px',
                          background: 'rgba(16,185,129,0.08)',
                          border: '1px solid rgba(16,185,129,0.2)',
                          borderRadius: '12px',
                          padding: '6px 12px',
                          fontSize: '11px',
                          color: '#10b981',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          animation: 'pulse 2s infinite'
                        }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                          <span>Focus Shield Active</span>
                        </div>
                      )}

                      <h2 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em', color: '#111827' }}>
                        {currentStep.name}
                      </h2>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '40px' }}>
                        <span style={{
                          fontSize: '10px',
                          textTransform: 'uppercase',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          background: 'rgba(0,0,0,0.05)',
                          fontWeight: 700,
                          letterSpacing: '0.05em',
                          color: '#4b5563',
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
                          <span style={{ fontSize: '10px', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '2px', background: 'rgba(59,130,246,0.1)', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>
                            <IconLink size={10} /> Linked Task
                          </span>
                        )}
                      </div>

                      {/* Adaptive step center UI element */}
                      {currentStep.type === 'timer' && (
                        <div style={{ position: 'relative', width: '260px', height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '40px' }}>
                          <svg width="260" height="260" style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}>
                            <circle cx="130" cy="130" r="115" stroke="rgba(0,0,0,0.04)" strokeWidth="3" fill="none" />
                            <circle
                              cx="130"
                              cy="130"
                              r="115"
                              stroke={stepColorHex}
                              strokeWidth="4"
                              fill="none"
                              strokeDasharray={2 * Math.PI * 115}
                              strokeDashoffset={(2 * Math.PI * 115) - ((timerPct / 100) * (2 * Math.PI * 115))}
                              strokeLinecap="round"
                              style={{ transition: 'stroke-dashoffset 0.5s linear' }}
                            />
                          </svg>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '64px', fontWeight: 800, letterSpacing: '-0.04em', color: '#111827', lineHeight: 1 }}>
                              {formatTime(timeLeft)}
                            </span>
                            <span style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px', fontWeight: 600 }}>
                              of {currentStep.dur} mins
                            </span>
                          </div>
                        </div>
                      )}

                      {currentStep.type === 'counter' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '40px', width: '100%' }}>
                          <div style={{
                            width: '200px',
                            height: '200px',
                            borderRadius: '50%',
                            background: '#ffffff',
                            border: \`4px solid \${stepColorHex}\`,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: \`0 10px 40px \${stepBgHex}\`,
                            marginBottom: '32px'
                          }}>
                            <span style={{ fontSize: '56px', fontWeight: 800, color: '#111827' }}>
                              {currentStep.currentCount || 0}
                            </span>
                            <span style={{ fontSize: '13px', color: '#6b7280', borderTop: '1px solid rgba(0,0,0,0.05)', padding: '6px 16px 0 16px', marginTop: '8px', fontWeight: 600 }}>
                              Target: {currentStep.targetCount || 50}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '16px', width: '100%', justifyContent: 'center' }}>
                            <button
                              onClick={() => {
                                const updated = { ...activeSession };
                                const st = updated.steps[currentStepIdx];
                                st.currentCount = Math.max(0, (st.currentCount || 0) - 1);
                                setActiveSession(updated);
                              }}
                              style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '50%',
                                background: 'rgba(0,0,0,0.04)',
                                border: 'none',
                                color: '#111827',
                                fontSize: '18px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700
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
                                width: '72px',
                                height: '72px',
                                borderRadius: '50%',
                                background: stepColorHex,
                                border: 'none',
                                color: '#ffffff',
                                fontSize: '24px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: \`0 8px 24px color-mix(in srgb, \${stepColorHex} 30%, transparent)\`
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
                                width: '56px',
                                height: '56px',
                                borderRadius: '50%',
                                background: 'rgba(0,0,0,0.04)',
                                border: 'none',
                                color: '#111827',
                                fontSize: '15px',
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
                          
                          <div style={{ marginTop: '24px', fontSize: '13px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                            <IconClock size={14} />
                            <span>Stopwatch: {Math.floor(elapsedTime / 60)}m {elapsedTime % 60}s</span>
                          </div>
                        </div>
                      )}

                      {currentStep.type === 'checklist' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '40px', width: '100%' }}>
                          <button
                            onClick={handleStepComplete}
                            style={{
                              width: '180px',
                              height: '180px',
                              borderRadius: '50%',
                              background: '#ffffff',
                              border: \`4px dashed \${stepColorHex}\`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: stepColorHex,
                              transition: 'all 0.2s',
                              marginBottom: '24px'
                            }}
                            onMouseEnter={(e) => {
                               e.currentTarget.style.background = \`color-mix(in srgb, \${stepColorHex} 5%, transparent)\`;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#ffffff';
                            }}
                          >
                            <IconCheck size={72} strokeWidth={2.5} />
                          </button>
                          <div style={{ fontSize: '15px', color: '#4b5563', fontWeight: 600 }}>
                            Tap to Complete Step
                          </div>
                          
                          <div style={{ marginTop: '24px', fontSize: '13px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                            <IconClock size={14} />
                            <span>Stopwatch: {Math.floor(elapsedTime / 60)}m {elapsedTime % 60}s</span>
                          </div>
                        </div>
                      )}

                      {/* Control buttons */}
                      <div style={{ display: 'flex', gap: '16px', width: '100%', justifyContent: 'center', marginTop: '16px' }}>
                        {currentStep.type === 'timer' && (
                          <>
                            <button
                              onClick={() => {
                                const total = parseInt(currentStep.dur || '5', 10) * 60;
                                setTimeLeft(total);
                              }}
                              style={{
                                padding: '12px 24px',
                                borderRadius: '24px',
                                background: 'rgba(0,0,0,0.05)',
                                border: 'none',
                                color: '#4b5563',
                                fontSize: '14px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.2s'
                              }}
                            >
                              <IconRefresh size={16} /> Reset
                            </button>
                            <button
                              onClick={() => setIsPlaying(!isPlaying)}
                              style={{
                                padding: '12px 32px',
                                borderRadius: '24px',
                                background: isPlaying ? 'rgba(0,0,0,0.05)' : stepColorHex,
                                border: 'none',
                                color: isPlaying ? '#4b5563' : '#ffffff',
                                fontSize: '14px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: isPlaying ? 'none' : \`0 6px 16px color-mix(in srgb, \${stepColorHex} 30%, transparent)\`,
                                transition: 'all 0.2s'
                              }}
                            >
                              {isPlaying ? <IconPlayerPause size={16} fill="currentColor" /> : <IconPlayerPlay size={16} fill="currentColor" />}
                              <span>{isPlaying ? 'Pause' : 'Resume'}</span>
                            </button>
                          </>
                        )}

                        <button
                          onClick={handleStepComplete}
                          style={{
                            padding: '12px 24px',
                            borderRadius: '24px',
                            background: currentStep.type === 'timer' ? 'rgba(0,0,0,0.05)' : stepColorHex,
                            border: 'none',
                            color: currentStep.type === 'timer' ? '#4b5563' : '#ffffff',
                            fontSize: '14px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s'
                          }}
                        >
                          <span>Skip</span>
                          <IconPlayerSkipForward size={16} fill="currentColor" />
                        </button>
                      </div>

                    </div>
                  )}
                </div>

                {/* Bottom Up-Next banner */}
                <div style={{
                  background: '#f9fafb',
                  borderTop: '1px solid rgba(0,0,0,0.05)',
                  padding: '16px 24px',
                  zIndex: 10,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  {currentStepIdx + 1 < totalSteps ? (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Up Next</span>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginTop: '2px' }}>
                          {activeSession.steps[currentStepIdx + 1].name}
                        </span>
                      </div>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#4b5563',
                        background: 'rgba(0,0,0,0.05)',
                        padding: '6px 12px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {activeSession.steps[currentStepIdx + 1].type === 'timer' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <IconHourglass size={14} />
                            <span>{activeSession.steps[currentStepIdx + 1].dur}m</span>
                          </span>
                        )}
                        {activeSession.steps[currentStepIdx + 1].type === 'counter' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <IconHash size={14} />
                            <span>{activeSession.steps[currentStepIdx + 1].targetCount} reps</span>
                          </span>
                        )}
                        {activeSession.steps[currentStepIdx + 1].type === 'checklist' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <IconCircleCheck size={14} />
                            <span>Task</span>
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div style={{ width: '100%', textAlign: 'center', fontSize: '13px', color: '#6b7280', fontWeight: 600 }}>
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
              background: '#ffffff',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              textAlign: 'center',
              color: '#111827'
            }}>
              <ConfettiCanvas />
              
              <div style={{ zIndex: 110, display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '340px' }}>
                <div style={{
                  width: '96px',
                  height: '96px',
                  borderRadius: '50%',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '2px solid #f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '48px',
                  marginBottom: '24px',
                  boxShadow: '0 10px 40px rgba(245,158,11,0.15)',
                }}>
                  🔥
                </div>
                
                <h1 style={{ fontSize: '36px', fontWeight: 800, margin: '0 0 12px 0', letterSpacing: '-0.03em', background: 'linear-gradient(to right, #f59e0b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {activeSession.streak || 1}-Day Streak!
                </h1>
                
                <p style={{ fontSize: '15px', color: '#4b5563', margin: '0 0 32px 0', lineHeight: 1.5, fontWeight: 500 }}>
                  Fantastic job completing your <strong>{activeSession.name}</strong> ritual today. You are building strong, persistent habits!
                </p>

                <Card style={{ background: '#f9fafb', border: '1px solid rgba(0,0,0,0.05)', padding: '20px', width: '100%', marginBottom: '32px', boxShadow: 'none' }}>
                  <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Ritual Summary</div>
                  <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '16px' }}>
                    <div>
                      <div style={{ fontSize: '24px', fontWeight: 800, color: '#111827' }}>{activeSession.steps.length}</div>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', fontWeight: 600 }}>Steps Done</div>
                    </div>
                    <div style={{ width: '1px', background: 'rgba(0,0,0,0.05)' }} />
                    <div>
                      <div style={{ fontSize: '24px', fontWeight: 800, color: '#111827' }}>100%</div>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', fontWeight: 600 }}>Completed</div>
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
                    padding: '14px',
                    borderRadius: '24px',
                    fontWeight: 700,
                    fontSize: '15px',
                    background: '#111827',
                    color: '#ffffff',
                    border: 'none',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
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
}`;

const finalCode = normalizedCode.substring(0, startIdx) + newZenPlayer + normalizedCode.substring(endIdx + endStr.length);
// Write back using system newline (optional, can just use \n)
fs.writeFileSync(path, finalCode, 'utf8');
console.log('Update complete.');

import { useState, useEffect, useRef } from 'react';
import { IconLogout, IconUser, IconSun, IconMoon, IconSearch, IconX, IconList } from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface TopBarProps {
  onOpenSyncModal: () => void;
  activeTab?: string;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}

export default function TopBar({ onOpenSyncModal, activeTab, searchQuery = '', onSearchChange }: TopBarProps) {
  const [dateStr, setDateStr] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, signOut, loadingData } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleOpenLists = () => {
    window.dispatchEvent(new CustomEvent('open-manage-lists'));
  };

  useEffect(() => {
    const now = new Date();
    const formatted = now.toLocaleDateString('en-IN', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
    setDateStr(formatted);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Reset search when activeTab changes
  useEffect(() => {
    setSearchActive(false);
    onSearchChange?.('');
  }, [activeTab]);

  // Build avatar initials from name or email
  const getInitials = () => {
    if (!user) return '?';
    const name = user.user_metadata?.full_name || user.user_metadata?.name;
    if (name) {
      return name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();
    }
    return user.email?.[0]?.toUpperCase() || '?';
  };

  const getDisplayName = () => {
    if (!user) return '';
    return user.user_metadata?.full_name || user.user_metadata?.name || user.email || '';
  };

  const getAvatarUrl = () => {
    return user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  };

  return (
    <div className="topbar">
      <div className="content-wrapper" style={{ position: 'relative' }}>
        {activeTab === 'notebook' && searchActive ? (
          <div style={{ display: 'flex', alignItems: 'center', flex: 1, marginRight: '12px' }}>
            <button
              onClick={() => {
                setSearchActive(false);
                onSearchChange?.('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text2)',
                cursor: 'pointer',
                marginRight: '8px',
                display: 'flex',
                alignItems: 'center',
                padding: '4px'
              }}
            >
              <IconX size={18} />
            </button>
            <input
              type="text"
              placeholder="Search notebook entries..."
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              autoFocus
              style={{
                flex: 1,
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                borderRadius: '20px',
                padding: '6px 14px',
                fontSize: '13px',
                color: 'var(--text)',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>
        ) : (
          <>
            {activeTab === 'notebook' ? (
              <button
                onClick={() => setSearchActive(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text2)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px',
                  borderRadius: '50%',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <IconSearch size={18} />
              </button>
            ) : (
              <div className="topdate" style={{ fontSize: '14px', fontWeight: '500', opacity: activeTab === 'tasks' ? 0 : 1 }}>
                {dateStr}
              </div>
            )}

            {/* Center Title for Tasks Tab (Hidden on Mobile) */}
            {activeTab === 'tasks' && (
              <div className="topbar-center-title mobile-hidden">
                Tasks
              </div>
            )}

            {/* Center Title for Notebook Tab */}
            {activeTab === 'notebook' && (
              <div style={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '16px',
                fontWeight: '700',
                color: 'var(--text)',
                pointerEvents: 'none',
                letterSpacing: '0.2px',
              }}>
                Notebook
              </div>
            )}
          </>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Sync indicator */}
          {loadingData && (
            <div className="sync-indicator-wrapper" style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 11, color: 'var(--text3)',
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--accent)',
                animation: 'topbarPulse 1.2s ease-in-out infinite',
              }} />
              <span className="mobile-hidden">Syncing…</span>
            </div>
          )}

          {/* All Lists Button - Mobile only, Tasks tab only */}
          {activeTab === 'tasks' && (
            <button
              className="mobile-only all-lists-btn"
              onClick={handleOpenLists}
              style={{
                padding: '6px 12px',
                borderRadius: '20px',
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                color: 'var(--text2)',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                marginRight: '4px'
              }}
            >
              <IconList size={16} />
              <span>All Lists</span>
            </button>
          )}

          {/* User avatar button */}
          {user && (
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                id="topbar-account-btn"
                onClick={() => setMenuOpen(v => !v)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'none',
                  border: '2px solid var(--green)',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  overflow: 'hidden',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                {/* Avatar */}
                <div style={{
                  width: '100%', height: '100%',
                  background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
                  overflow: 'hidden',
                }}>
                  {getAvatarUrl()
                    ? <img src={getAvatarUrl()} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : getInitials()
                  }
                </div>
              </button>

              {/* Dropdown */}
              {menuOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: 6, minWidth: 220,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                  zIndex: 200,
                  animation: 'menuSlideIn 0.15s ease',
                }}>
                  {/* User info header */}
                  <div style={{
                    padding: '10px 12px 12px', borderBottom: '1px solid var(--border)', marginBottom: 4,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0,
                        overflow: 'hidden',
                      }}>
                        {getAvatarUrl()
                          ? <img src={getAvatarUrl()} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : getInitials()
                        }
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {getDisplayName()}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
                          <span style={{ fontSize: 11, color: 'var(--text3)' }}>Synced to cloud</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Menu items */}
                  <button
                    onClick={() => { setMenuOpen(false); onOpenSyncModal?.(); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                      padding: '9px 12px', borderRadius: 8, border: 'none',
                      background: 'none', color: 'var(--text2)', fontSize: 13, cursor: 'pointer',
                      transition: 'all 0.15s', fontFamily: 'inherit', textAlign: 'left',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.color = 'var(--text)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text2)'; }}
                  >
                    <IconUser size={15} />
                    Account Details
                  </button>

                  <button
                    onClick={toggleTheme}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                      padding: '9px 12px', borderRadius: 8, border: 'none',
                      background: 'none', color: 'var(--text2)', fontSize: 13, cursor: 'pointer',
                      transition: 'all 0.15s', fontFamily: 'inherit', textAlign: 'left',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.color = 'var(--text)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text2)'; }}
                  >
                    {theme === 'light' ? <IconMoon size={15} /> : <IconSun size={15} />}
                    {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                  </button>

                  <button
                    id="topbar-signout-btn"
                    onClick={() => { setMenuOpen(false); signOut(); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                      padding: '9px 12px', borderRadius: 8, border: 'none',
                      background: 'none', color: 'var(--red)', fontSize: 13, cursor: 'pointer',
                      transition: 'all 0.15s', fontFamily: 'inherit', textAlign: 'left',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-bg)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                  >
                    <IconLogout size={15} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes topbarPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
        @keyframes menuSlideIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.9); }
          to   { opacity: 1; transform: scale(1); }
        }
        .topbar-center-title {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
          pointer-events: none;
          letter-spacing: 0.2px;
        }
        .mobile-hidden {
          display: block;
        }
        .all-lists-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          animation: popIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .mobile-only {
          display: none !important;
        }
        @media (max-width: 767px) {
          .mobile-hidden {
            display: none !important;
          }
          .mobile-only {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
}

import { IconX, IconCloudCheck, IconLogout, IconShield } from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';

interface SyncConfigProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SyncConfig({ isOpen, onClose }: SyncConfigProps) {
  const { user, signOut, loadingData } = useAuth();

  if (!isOpen) return null;

  const getInitials = () => {
    if (!user) return '?';
    const name = user.user_metadata?.full_name || user.user_metadata?.name;
    if (name) return name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();
    return user.email?.[0]?.toUpperCase() || '?';
  };

  const getDisplayName = () => {
    if (!user) return '';
    return user.user_metadata?.full_name || user.user_metadata?.name || user.email || '';
  };

  const getAvatarUrl = () => user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;

  const handleSignOut = async () => {
    onClose();
    await signOut();
  };

  return (
    <div
      className="modal-overlay open"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={{ width: '92%', maxWidth: '400px' }}>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="modal-title !mb-0 font-bold text-lg">Account</div>
          <button onClick={onClose} className="text-[#5c5b6e] hover:text-[#f0eff5] cursor-pointer">
            <IconX size={18} />
          </button>
        </div>

        {/* Avatar + user info */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '16px', borderRadius: 14,
          background: '#1e1e22', border: '1px solid #2e2e36',
          marginBottom: 20,
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'linear-gradient(135deg, #7c6af7, #a594ff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 700, color: '#fff', flexShrink: 0,
            overflow: 'hidden',
          }}>
            {getAvatarUrl()
              ? <img src={getAvatarUrl()} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : getInitials()
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f0eff5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {getDisplayName()}
            </div>
            <div style={{ fontSize: 12, color: '#5c5b6e', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 500 }}>
                {loadingData ? 'Syncing…' : 'Synced to cloud'}
              </span>
            </div>
          </div>
        </div>

        {/* Status cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px', borderRadius: 12,
            background: '#0d2a1a', border: '1px solid rgba(74,222,128,0.2)',
          }}>
            <IconCloudCheck size={18} style={{ color: '#4ade80', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#4ade80' }}>Cloud Sync Active</div>
              <div style={{ fontSize: 11, color: '#5c5b6e', marginTop: 1 }}>
                All your data is automatically backed up in real-time.
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px', borderRadius: 12,
            background: '#1a1a2e', border: '1px solid rgba(124,106,247,0.2)',
          }}>
            <IconShield size={18} style={{ color: '#7c6af7', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#a594ff' }}>Private & Secure</div>
              <div style={{ fontSize: 11, color: '#5c5b6e', marginTop: 1 }}>
                Row-level security — only you can access your data.
              </div>
            </div>
          </div>
        </div>

        {/* User ID */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#5c5b6e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            Account ID
          </div>
          <div style={{
            padding: '8px 12px', borderRadius: 8,
            background: '#0f0f11', border: '1px solid #1e1e22',
            fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#3a3a45',
            wordBreak: 'break-all',
          }}>
            {user?.id}
          </div>
        </div>

        {/* Sign out button */}
        <button
          id="account-signout-btn"
          onClick={handleSignOut}
          style={{
            width: '100%', padding: '11px',
            background: 'none', border: '1px solid rgba(248,113,113,0.3)',
            borderRadius: 12, color: '#f87171', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, transition: 'all 0.2s', fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#2a0f0f'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
        >
          <IconLogout size={16} />
          Sign Out from this Device
        </button>
      </div>
    </div>
  );
}

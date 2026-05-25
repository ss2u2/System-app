import { IconCloudCheck, IconLogout, IconShield } from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';
// Import UI Design System components
import Button from './ui/Button';
import Modal from './ui/Modal';

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
    <Modal isOpen={isOpen} onClose={onClose} title="Account" maxWidth="400px">
      {/* Avatar + user info */}
      <div className="flex items-center gap-4 p-4 rounded-[14px] bg-[var(--bg3)] border border-[var(--border)] mb-5">
        <div className="w-[52px] h-[52px] rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent2)] flex items-center justify-center text-lg font-bold text-white shrink-0 overflow-hidden">
          {getAvatarUrl()
            ? <img src={getAvatarUrl()} alt="avatar" className="w-full h-full object-cover" />
            : getInitials()
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-[var(--text)] truncate">
            {getDisplayName()}
          </div>
          <div className="text-xs text-[var(--text3)] mt-0.5 truncate">
            {user?.email}
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#4ade80] shrink-0" />
            <span className="text-[11px] text-[#4ade80] font-semibold">
              {loadingData ? 'Syncing…' : 'Synced to cloud'}
            </span>
          </div>
        </div>
      </div>

      {/* Status cards */}
      <div className="flex flex-col gap-2.5 mb-6">
        <div className="flex items-center gap-3 p-3 px-3.5 rounded-xl bg-[var(--green-bg)] border border-[var(--green)] border-opacity-20">
          <IconCloudCheck size={18} className="text-[var(--green)] shrink-0" />
          <div>
            <div className="text-[13px] font-semibold text-[var(--green)]">Cloud Sync Active</div>
            <div className="text-[11px] text-[var(--text3)] mt-0.5">
              All your data is automatically backed up in real-time.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 px-3.5 rounded-xl bg-[var(--accent-bg)] border border-[var(--accent)] border-opacity-20">
          <IconShield size={18} className="text-[var(--accent)] shrink-0" />
          <div>
            <div className="text-[13px] font-semibold text-[var(--accent)]">Private & Secure</div>
            <div className="text-[11px] text-[var(--text3)] mt-0.5">
              Row-level security — only you can access your data.
            </div>
          </div>
        </div>
      </div>

      {/* User ID */}
      <div className="mb-5">
        <div className="text-[11px] text-[var(--text3)] font-semibold uppercase tracking-wider mb-1.5">
          Account ID
        </div>
        <div className="p-2 px-3 rounded-lg bg-[var(--bg)] border border-[var(--border)] font-mono text-[11px] text-[var(--text2)] word-break break-all select-all">
          {user?.id}
        </div>
      </div>

      {/* Sign out button */}
      <Button
        id="account-signout-btn"
        variant="danger"
        onClick={handleSignOut}
        fullWidth
        style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}
      >
        <IconLogout size={16} />
        Sign Out from this Device
      </Button>
    </Modal>
  );
}

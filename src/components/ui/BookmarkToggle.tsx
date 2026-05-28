import React from 'react';
import { IconBookmark, IconBookmarkFilled } from '@tabler/icons-react';

interface BookmarkToggleProps {
  checked: boolean;
  onToggle: (e: React.MouseEvent<HTMLButtonElement>) => void;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function BookmarkToggle({ checked, onToggle, size = 16, className = '', style }: BookmarkToggleProps) {
  return (
    <button
      type="button"
      className={`notebook-bookmark-btn ${checked ? 'active' : ''} ${className}`.trim()}
      onClick={onToggle}
      style={style}
      aria-label={checked ? 'Remove Bookmark' : 'Add Bookmark'}
    >
      {checked ? <IconBookmarkFilled size={size} /> : <IconBookmark size={size} />}
    </button>
  );
}

export default BookmarkToggle;

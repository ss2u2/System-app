import React from 'react';
import { IconStar, IconStarFilled } from '@tabler/icons-react';

interface StarToggleProps {
  checked: boolean;
  onToggle: (e: React.MouseEvent<HTMLButtonElement>) => void;
  size?: number;
  className?: string;
}

export function StarToggle({ checked, onToggle, size = 18, className = '' }: StarToggleProps) {
  return (
    <button
      type="button"
      className={`custom-task-star-btn ${checked ? 'active' : ''} ${className}`.trim()}
      onClick={onToggle}
      aria-label={checked ? 'Unstar Task' : 'Star Task'}
    >
      {checked ? <IconStarFilled size={size} /> : <IconStar size={size} />}
    </button>
  );
}

export default StarToggle;

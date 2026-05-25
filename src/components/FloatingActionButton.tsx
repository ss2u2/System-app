import React from 'react';

interface FloatingActionButtonProps {
  onClick: (e: React.MouseEvent) => void;
  icon: React.ElementType;
  title?: string;
  className?: string;
}

export default function FloatingActionButton({
  onClick,
  icon: Icon,
  title,
  className = ""
}: FloatingActionButtonProps) {
  return (
    <button
      className={`shared-fab ${className}`}
      onClick={onClick}
      title={title}
    >
      <Icon size={24} stroke={2.1} />
    </button>
  );
}

import React, { useState, useRef, useEffect } from 'react';

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

export function Dropdown({ trigger, children, align = 'right', className = '' }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleChildrenClick = () => {
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`dropdown-container ${className} ${isOpen ? 'open' : ''}`}
      style={{
        position: 'relative',
        display: 'inline-block',
        zIndex: isOpen ? 1000 : 'auto',
      }}
    >
      <div onClick={toggleDropdown} style={{ display: 'inline-flex', cursor: 'pointer' }}>
        {trigger}
      </div>
      {isOpen && (
        <>
          <div
            className="dropdown-backdrop"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          />
          <div
            className="tasks-dropdown-menu"
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              right: align === 'right' ? 0 : 'auto',
              left: align === 'left' ? 0 : 'auto',
              display: 'block',
              zIndex: 999,
            }}
            onClick={handleChildrenClick}
          >
            <div className="tasks-dropdown-menu-inner">
              {children}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface DropdownItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'danger';
}

export function DropdownItem({ children, variant = 'default', className = '', ...props }: DropdownItemProps) {
  return (
    <button
      type="button"
      className={`dropdown-item ${variant === 'danger' ? 'danger' : ''} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

export default Dropdown;

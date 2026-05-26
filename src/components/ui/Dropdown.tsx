import React, { useState, useRef, useEffect } from 'react';

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

// Helper to find the closest ancestor container that might clip the dropdown
const getClippingAncestor = (el: HTMLElement): HTMLElement | null => {
  let parent = el.parentElement;
  while (parent) {
    const style = window.getComputedStyle(parent);
    if (
      style.overflowY === 'auto' ||
      style.overflowY === 'hidden' ||
      style.overflowY === 'scroll' ||
      style.overflow === 'auto' ||
      style.overflow === 'hidden' ||
      style.overflow === 'scroll' ||
      parent.classList.contains('bottom-sheet-content') ||
      parent.classList.contains('modal')
    ) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
};

export function Dropdown({ trigger, children, align = 'right', className = '' }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const checkPosition = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const clippingAncestor = getClippingAncestor(containerRef.current);
        
        let spaceBelow = window.innerHeight - rect.bottom;
        if (clippingAncestor) {
          const ancestorRect = clippingAncestor.getBoundingClientRect();
          spaceBelow = ancestorRect.bottom - rect.bottom;
        }
        
        // If less than 180px below, open upwards (approx height of menu)
        setOpenUp(spaceBelow < 180);
      }
    };

    checkPosition();
    window.addEventListener('scroll', checkPosition, true);
    window.addEventListener('resize', checkPosition);

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', checkPosition, true);
      window.removeEventListener('resize', checkPosition);
    };
  }, [isOpen]);

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const clippingAncestor = getClippingAncestor(containerRef.current);
      
      let spaceBelow = window.innerHeight - rect.bottom;
      if (clippingAncestor) {
        const ancestorRect = clippingAncestor.getBoundingClientRect();
        spaceBelow = ancestorRect.bottom - rect.bottom;
      }
      
      // Increased threshold to 200px and check specifically before opening
      setOpenUp(spaceBelow < 200);
    }
    
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
            ref={dropdownRef}
            className={`tasks-dropdown-menu ${openUp ? 'open-up' : ''}`}
            style={{
              position: 'absolute',
              top: openUp ? 'auto' : 'calc(100% + 4px)',
              bottom: openUp ? 'calc(100% + 4px)' : 'auto',
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

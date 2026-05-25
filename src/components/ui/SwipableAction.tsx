import React, { useState, useRef } from 'react';
import { IconTrash } from '@tabler/icons-react';

interface SwipableActionProps {
  children: React.ReactNode;
  onAction: (e?: any) => void;
  actionIcon?: React.ReactNode;
  actionColor?: string;
  threshold?: number;
  disabled?: boolean;
}

export default function SwipableAction({
  children,
  onAction,
  actionIcon = <IconTrash size={20} />,
  actionColor = 'var(--red)',
  threshold = 100,
  disabled = false,
}: SwipableActionProps) {
  const [swipeX, setSwipeX] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const isSwipingRef = useRef(false);
  const isScrollingRef = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    isSwipingRef.current = false;
    isScrollingRef.current = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    if (isScrollingRef.current) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    
    const diffX = currentX - touchStartXRef.current;
    const diffY = currentY - touchStartYRef.current;

    // Detect gesture direction if not yet established
    if (!isSwipingRef.current && !isScrollingRef.current) {
      const absX = Math.abs(diffX);
      const absY = Math.abs(diffY);
      
      if (absX > 8 || absY > 8) {
        if (absY > absX) {
          isScrollingRef.current = true;
          return;
        } else {
          isSwipingRef.current = true;
        }
      } else {
        return;
      }
    }

    // Only allow swiping left (negative diffX)
    if (isSwipingRef.current && diffX < 0) {
      setSwipeX(diffX);
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (isSwipingRef.current && swipeX < -threshold) {
      onAction(e);
    }
    
    setSwipeX(0);
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    
    if (isSwipingRef.current) {
      e.stopPropagation();
    }
    
    setTimeout(() => {
      isSwipingRef.current = false;
      isScrollingRef.current = false;
    }, 50);
  };

  return (
    <div
      style={{ position: 'relative', overflow: 'hidden', width: '100%' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Action Background */}
      {swipeX < 0 && (
        <div 
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: '100%',
            backgroundColor: actionColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingRight: '20px',
            color: '#fff',
            zIndex: 0,
            opacity: Math.min(1, Math.abs(swipeX) / threshold)
          }}
        >
          {actionIcon}
        </div>
      )}

      {/* Content Wrapper */}
      <div
        style={{
          width: '100%',
          position: 'relative',
          zIndex: 1,
          transform: `translateX(${swipeX}px)`,
          transition: swipeX === 0 ? 'transform 0.2s ease-out' : 'none',
          backgroundColor: 'inherit'
        }}
      >
        {children}
      </div>
    </div>
  );
}

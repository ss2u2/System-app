import { useState, useRef, useEffect } from 'react';
import { triggerHaptic } from '../utils/haptic';

export interface DragItem {
  id: number | string;
}

export interface UsePointerDragReorderProps<T extends DragItem> {
  items: T[];
  onReorder: (draggedId: T['id'], overId: T['id']) => void;
  onEdit?: (id: T['id']) => void;
  enabled: boolean;
}

function getScrollParent(node: HTMLElement | null): HTMLElement | null {
  if (!node) return null;
  const overflowY = window.getComputedStyle(node).overflowY;
  const isScrollable = overflowY === 'auto' || overflowY === 'scroll';
  if (isScrollable && node.scrollHeight > node.clientHeight) {
    return node;
  }
  return getScrollParent(node.parentElement);
}

export function usePointerDragReorder<T extends DragItem>({
  items,
  onReorder,
  onEdit,
  enabled,
}: UsePointerDragReorderProps<T>) {
  const [draggedId, setDraggedId] = useState<T['id'] | null>(null);
  const [overId, setOverId] = useState<T['id'] | null>(null);
  const dragOffsetRef = useRef(0);
  const [, setForceUpdate] = useState(0);

  const dragInfo = useRef<{
    itemId: T['id'];
    startIndex: number;
    startY: number;
    draggedRow: HTMLElement;
    container: HTMLElement;
    containerRect: DOMRect;
    draggedRect: DOMRect;
    rects: { id: T['id']; centerY: number; height: number }[];
    isDraggingStarted: boolean;
    overId: T['id'] | null;
  } | null>(null);

  // Use a ref for inputs to ensure event handlers capture the latest references without resetting listeners
  const callbacksRef = useRef({
    items,
    onReorder,
    onEdit,
    enabled,
    draggedId,
    overId,
  });

  useEffect(() => {
    callbacksRef.current = {
      items,
      onReorder,
      onEdit,
      enabled,
      draggedId,
      overId,
    };
  }, [items, onReorder, onEdit, enabled, draggedId, overId]);

  // Remeasure layout rects and heights once dragging starts and the dragged item has collapsed its subtasks
  useEffect(() => {
    if (draggedId !== null && dragInfo.current) {
      const info = dragInfo.current;
      const containerRect = info.container.getBoundingClientRect();
      const draggedRect = info.draggedRow.getBoundingClientRect();
      
      // Subtract dragOffsetRef.current to find the initial untransformed top coordinate
      const untransformedTop = draggedRect.top - dragOffsetRef.current;
      const adjustedDraggedRect = new DOMRect(
        draggedRect.left,
        untransformedTop,
        draggedRect.width,
        draggedRect.height
      );

      const rowElements = Array.from(info.container.children) as HTMLElement[];
      const itemRows = rowElements.filter((el) => el.hasAttribute('data-drag-id'));

      const rects = itemRows.map((el) => {
        const rect = el.getBoundingClientRect();
        const rawId = el.getAttribute('data-drag-id')!;
        const id: T['id'] = isNaN(Number(rawId)) ? rawId : Number(rawId);
        
        let centerY = rect.top + rect.height / 2;
        // If it is the dragged item itself, subtract the translation offset to get the untransformed centerY
        if (id === draggedId) {
          centerY -= dragOffsetRef.current;
        }

        return {
          id,
          centerY,
          height: rect.height,
        };
      });

      info.containerRect = containerRect;
      info.draggedRect = adjustedDraggedRect;
      info.rects = rects;
    }
  }, [draggedId]);

  const handlePointerDown = (e: React.PointerEvent<HTMLElement>, itemId: T['id'], index: number) => {
    if (!callbacksRef.current.enabled) return;
    if (e.button !== 0) return; // Left click only

    const isTouch = e.pointerType === 'touch';
    const target = e.target as HTMLElement;

    const isNoDrag = target.closest('[data-nodrag]');
    const isIgnored =
      target.closest('button') ||
      target.closest('.custom-task-checkbox') ||
      target.closest('.task-item-subtask-cb') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('select') ||
      (isNoDrag && (!isTouch || !target.closest('.j-content')));

    if (isIgnored) {
      return;
    }

    if (!isTouch) {
      e.preventDefault();
    }

    const draggedRow = e.currentTarget;
    const container = draggedRow.parentElement;
    if (!container) return;

    const scrollParent = getScrollParent(container);
    const initialScrollTop = scrollParent ? scrollParent.scrollTop : 0;

    // Fetch list rows and filter to our reorderable items
    const rowElements = Array.from(container.children) as HTMLElement[];
    const itemRows = rowElements.filter((el) => el.hasAttribute('data-drag-id'));

    const containerRect = container.getBoundingClientRect();
    const draggedRect = draggedRow.getBoundingClientRect();

    const rects = itemRows.map((el) => {
      const rect = el.getBoundingClientRect();
      const rawId = el.getAttribute('data-drag-id')!;
      const id: T['id'] = isNaN(Number(rawId)) ? rawId : Number(rawId);
      return {
        id,
        centerY: rect.top + rect.height / 2,
        height: rect.height,
      };
    });

    dragInfo.current = {
      itemId,
      startIndex: index,
      startY: e.clientY,
      draggedRow,
      container,
      containerRect,
      draggedRect,
      rects,
      isDraggingStarted: false,
      overId: itemId,
    };

    let isDraggingAllowed = !isTouch;
    let longPressTimer: number | null = null;
    const startX = e.clientX;
    const startY = e.clientY;
    let lastClientY = e.clientY;

    // Auto-scroll loop states
    let scrollSpeed = 0; // Positive (scroll down), Negative (scroll up)
    let scrollIntervalId: number | null = null;

    const updateDragPosition = (currentClientY: number) => {
      if (!dragInfo.current) return;
      const info = dragInfo.current;
      const deltaY = currentClientY - info.startY;

      const currentScrollTop = scrollParent ? scrollParent.scrollTop : 0;
      const scrollTopDiff = currentScrollTop - initialScrollTop;
      const adjustedDeltaY = deltaY + scrollTopDiff;

      // Constraint bounds calculation (taking scroll into account)
      const maxDragUp = info.containerRect.top - info.draggedRect.top + scrollTopDiff;
      const maxDragDown = info.containerRect.bottom - info.draggedRect.bottom + scrollTopDiff;
      const constrainedDeltaY = Math.max(maxDragUp, Math.min(maxDragDown, adjustedDeltaY));

      // 1. Update offset ref immediately (so React reads latest values on render)
      dragOffsetRef.current = constrainedDeltaY;

      // 2. Direct DOM manipulation to bypass React state updates for buttery smooth drag (60/120fps)
      info.draggedRow.style.transform = `translateY(${constrainedDeltaY}px)`;
      info.draggedRow.style.zIndex = '100';
      info.draggedRow.style.position = 'relative';
      info.draggedRow.style.transition = 'none';

      // Match overlap position to find target reorder item index using stable untransformed initial rects
      const currentCenterY = info.draggedRect.top + constrainedDeltaY + info.draggedRect.height / 2;
      let targetIndex = info.startIndex;
      const rectsList = info.rects;
      
      if (rectsList.length > 0) {
        if (currentCenterY <= rectsList[0].centerY) {
          targetIndex = 0;
        } else if (currentCenterY >= rectsList[rectsList.length - 1].centerY) {
          targetIndex = rectsList.length - 1;
        } else {
          for (let i = 0; i < rectsList.length - 1; i++) {
            const current = rectsList[i];
            const next = rectsList[i + 1];
            if (currentCenterY >= current.centerY && currentCenterY <= next.centerY) {
              const distToCurrent = currentCenterY - current.centerY;
              const distToNext = next.centerY - currentCenterY;
              targetIndex = distToCurrent < distToNext ? i : i + 1;
              break;
            }
          }
        }
      }

      const activeOverId = rectsList[targetIndex]?.id ?? null;
      
      // Synchronously check and update overId within our drag ref, scheduling state update
      if (activeOverId !== info.overId) {
        info.overId = activeOverId;
        setOverId(activeOverId);
        triggerHaptic(8); // Subtle 8ms tick when overtaking an item
      }
    };

    const startScrollLoop = () => {
      if (scrollIntervalId !== null) return;
      scrollIntervalId = window.setInterval(() => {
        if (!scrollParent) return;
        const previousScrollTop = scrollParent.scrollTop;
        scrollParent.scrollTop += scrollSpeed;
        
        // If we actually scrolled, update the item's coordinates relative to viewport
        if (scrollParent.scrollTop !== previousScrollTop) {
          updateDragPosition(lastClientY);
        }
      }, 16); // ~60fps
    };

    const stopScrollLoop = () => {
      if (scrollIntervalId !== null) {
        window.clearInterval(scrollIntervalId);
        scrollIntervalId = null;
      }
    };

    if (isTouch) {
      longPressTimer = window.setTimeout(() => {
        if (rects.length <= 1) return; // Do not start drag for single items

        // Trigger burst vibration signal (subtle 10ms micro-tick)
        triggerHaptic(10);

        isDraggingAllowed = true;

        if (dragInfo.current) {
          dragInfo.current.isDraggingStarted = true;
          setDraggedId(itemId);

          // Capture pointer once long press is active
          try {
            draggedRow.setPointerCapture(e.pointerId);
          } catch (err) {
            console.warn("Could not set pointer capture on long press:", err);
          }
        }
      }, 500); // 500ms tap and hold delay
    } else {
      // Capture pointer immediately for mouse/pen
      try {
        draggedRow.setPointerCapture(e.pointerId);
      } catch (err) {
        console.warn("Could not set pointer capture:", err);
      }
    }

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!dragInfo.current) return;
      const info = dragInfo.current;
      lastClientY = moveEvent.clientY;

      // Handle touch scroll detection / canceling long press
      if (isTouch && !isDraggingAllowed) {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // If the user moves their finger more than 10px before the long press completes,
        // it means they are scrolling or swiping. Cancel the long press timer.
        if (distance > 10) {
          if (longPressTimer !== null) {
            window.clearTimeout(longPressTimer);
            longPressTimer = null;
          }
        }
        return; // Don't proceed to drag logic
      }

      const deltaY = moveEvent.clientY - info.startY;

      // Start drag only after passing a small movement threshold to allow tap/clicks (for mouse)
      if (!info.isDraggingStarted) {
        if (Math.abs(deltaY) > 4) {
          if (info.rects.length <= 1) {
            return;
          }
          info.isDraggingStarted = true;
          setDraggedId(info.itemId);
        } else {
          return;
        }
      }

      // Update dragging coordinates
      updateDragPosition(moveEvent.clientY);

      // Handle boundary scrolling zone detection
      if (scrollParent && isDraggingAllowed) {
        const scrollRect = scrollParent.getBoundingClientRect();
        const pointerY = moveEvent.clientY;
        const threshold = 50; // zone size from top/bottom to trigger scrolling

        if (pointerY < scrollRect.top + threshold) {
          const intensity = (scrollRect.top + threshold - pointerY) / threshold;
          scrollSpeed = -Math.max(1, Math.min(8, intensity * 5));
          startScrollLoop();
        } else if (pointerY > scrollRect.bottom - threshold) {
          const intensity = (pointerY - (scrollRect.bottom - threshold)) / threshold;
          scrollSpeed = Math.max(1, Math.min(8, intensity * 5));
          startScrollLoop();
        } else {
          scrollSpeed = 0;
          stopScrollLoop();
        }
      }
    };

    const handleTouchMove = (touchEvent: TouchEvent) => {
      // Actively block browser scrolling if long press has activated
      if (isDraggingAllowed) {
        touchEvent.preventDefault();
      }
    };

    const handlePointerUp = () => {
      if (longPressTimer !== null) {
        window.clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      stopScrollLoop();
      cleanup();

      if (!dragInfo.current) return;
      const info = dragInfo.current;

      // Reset direct style values to allow React state/render styles to govern
      info.draggedRow.style.transform = '';
      info.draggedRow.style.zIndex = '';
      info.draggedRow.style.position = '';
      info.draggedRow.style.transition = '';

      if (info.isDraggingStarted) {
        const targetId = info.overId;
        if (targetId !== null && targetId !== info.itemId) {
          callbacksRef.current.onReorder(info.itemId, targetId);
        }
      } else {
        callbacksRef.current.onEdit?.(info.itemId);
      }

      setDraggedId(null);
      setOverId(null);
      dragOffsetRef.current = 0;
      dragInfo.current = null;
      setForceUpdate((p) => p + 1);
    };

    const handlePointerCancel = () => {
      if (longPressTimer !== null) {
        window.clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      stopScrollLoop();
      cleanup();

      if (dragInfo.current) {
        const info = dragInfo.current;
        info.draggedRow.style.transform = '';
        info.draggedRow.style.zIndex = '';
        info.draggedRow.style.position = '';
        info.draggedRow.style.transition = '';
      }

      setDraggedId(null);
      setOverId(null);
      dragOffsetRef.current = 0;
      dragInfo.current = null;
    };

    const cleanup = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
      window.removeEventListener('touchmove', handleTouchMove);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
  };

  const getItemStyle = (id: T['id'], index: number): React.CSSProperties => {
    if (!callbacksRef.current.enabled) return {};

    const baseStyle: React.CSSProperties = {
      cursor: draggedId === id ? 'grabbing' : 'grab',
      touchAction: draggedId !== null ? 'none' : 'pan-y', // Let touch devices scroll unless dragging is active
      willChange: draggedId !== null ? 'transform' : undefined,
    };

    if (draggedId === null) return baseStyle;

    // Active item translation
    if (id === draggedId) {
      return {
        ...baseStyle,
        transform: `translateY(${dragOffsetRef.current}px)`,
        zIndex: 100,
        position: 'relative' as const,
        transition: 'none',
      };
    }

    if (overId === null || draggedId === overId) return baseStyle;

    const list = callbacksRef.current.items;
    const dragIndex = list.findIndex((item) => item.id === draggedId);
    const overIndex = list.findIndex((item) => item.id === overId);

    if (dragIndex === -1 || overIndex === -1) return baseStyle;

    const draggedHeight = dragInfo.current?.draggedRect.height || 54;
    const shiftTransition = 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)';

    // Shift other elements to simulate fluid order exchange
    const isForward = dragIndex < overIndex;
    if (isForward) {
      if (index > dragIndex && index <= overIndex) {
        return {
          ...baseStyle,
          transform: `translateY(-${draggedHeight}px)`,
          transition: shiftTransition,
        };
      }
    } else {
      if (index < dragIndex && index >= overIndex) {
        return {
          ...baseStyle,
          transform: `translateY(${draggedHeight}px)`,
          transition: shiftTransition,
        };
      }
    }

    return {
      ...baseStyle,
      transition: shiftTransition,
    };
  };

  const getItemProps = (id: T['id'], index: number) => {
    return {
      'data-drag-id': String(id),
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => handlePointerDown(e, id, index),
    };
  };

  return {
    draggedId,
    overId,
    getItemStyle,
    getItemProps,
  };
}

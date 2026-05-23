import { useState, useRef, useEffect } from 'react';

export interface DragItem {
  id: number | string;
}

export interface UsePointerDragReorderProps<T extends DragItem> {
  items: T[];
  onReorder: (draggedId: T['id'], overId: T['id']) => void;
  onEdit?: (id: T['id']) => void;
  enabled: boolean;
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

  const handlePointerDown = (e: React.PointerEvent<HTMLElement>, itemId: T['id'], index: number) => {
    if (!callbacksRef.current.enabled) return;
    if (e.button !== 0) return; // Left click only

    // Ignore interactive element clicks to prevent dragging when clicking inputs or buttons
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('.custom-task-checkbox') ||
      target.closest('.task-item-subtask-cb') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('select') ||
      target.closest('[data-nodrag]')
    ) {
      return;
    }

    const isTouch = e.pointerType === 'touch';
    if (!isTouch) {
      e.preventDefault();
    }

    const draggedRow = e.currentTarget;
    const container = draggedRow.parentElement;
    if (!container) return;

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

    if (rects.length <= 1) return;

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

    if (isTouch) {
      longPressTimer = window.setTimeout(() => {
        // Trigger burst vibration signal
        if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
          try {
            window.navigator.vibrate(80);
          } catch (vErr) {
            console.warn("Vibration failed:", vErr);
          }
        }

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
          info.isDraggingStarted = true;
          setDraggedId(info.itemId);
        } else {
          return;
        }
      }

      moveEvent.preventDefault();

      // Constraint bounds calculation
      const maxDragUp = info.containerRect.top - info.draggedRect.top;
      const maxDragDown = info.containerRect.bottom - info.draggedRect.bottom;
      const constrainedDeltaY = Math.max(maxDragUp, Math.min(maxDragDown, deltaY));

      // 1. Update offset ref immediately (so React reads latest values on render)
      dragOffsetRef.current = constrainedDeltaY;

      // 2. Direct DOM manipulation to bypass React state updates for buttery smooth drag (60/120fps)
      info.draggedRow.style.transform = `translateY(${constrainedDeltaY}px)`;
      info.draggedRow.style.zIndex = '100';
      info.draggedRow.style.position = 'relative';
      info.draggedRow.style.transition = 'none';

      // Match overlap position to find target reorder item index
      const currentCenterY = info.draggedRect.top + info.draggedRect.height / 2 + constrainedDeltaY;
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
      }
    };

    const handlePointerUp = () => {
      if (longPressTimer !== null) {
        window.clearTimeout(longPressTimer);
        longPressTimer = null;
      }
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
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
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

import { useState, useEffect, useRef } from 'react';
import { calculateLayout } from '../utils/layoutUtils';
import type { LayoutState } from '../types';

export function usePanelLayout(isOpen: boolean, onClose: () => void) {
  const [layout, setLayout] = useState<LayoutState>(() =>
    typeof window !== 'undefined' ? calculateLayout() : { width: 900, left: 0 }
  );

  const panelRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);

  // Update layout on window resize
  useEffect(() => {
    const updateLayout = () => {
      setLayout(calculateLayout());
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  // Close panel on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Drag to close functionality
  useEffect(() => {
    const handle = dragHandleRef.current;
    const panel = panelRef.current;
    if (!handle || !panel) return;

    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    const onDragStart = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      currentY = startY;
      panel.style.transition = 'none';
    };

    const onDragMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      currentY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const diff = currentY - startY;

      // Only allow dragging down
      if (diff > 0) {
        panel.style.transform = `translateY(${diff}px)`;
      }
    };

    const onDragEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      panel.style.transition = 'transform 0.3s ease-out';

      const diff = currentY - startY;

      // Close if dragged down more than 150px
      if (diff > 150) {
        onClose();
      } else {
        panel.style.transform = 'translateY(0)';
      }
    };

    handle.addEventListener('mousedown', onDragStart);
    handle.addEventListener('touchstart', onDragStart);
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('touchmove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
    document.addEventListener('touchend', onDragEnd);

    return () => {
      handle.removeEventListener('mousedown', onDragStart);
      handle.removeEventListener('touchstart', onDragStart);
      document.removeEventListener('mousemove', onDragMove);
      document.removeEventListener('touchmove', onDragMove);
      document.removeEventListener('mouseup', onDragEnd);
      document.removeEventListener('touchend', onDragEnd);
    };
  }, [onClose]);

  return {
    layout,
    panelRef,
    dragHandleRef,
  };
}

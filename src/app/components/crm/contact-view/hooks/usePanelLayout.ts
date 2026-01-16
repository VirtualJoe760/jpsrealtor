// usePanelLayout hook - Manages panel width and drag/resize behavior

import { useState, useCallback, useEffect } from 'react';
import { PanelLayout } from '../types/index';
import { getOptimalPanelWidth, calculatePanelWidth } from '../utils';

export function usePanelLayout() {
  const [layout, setLayout] = useState<PanelLayout>({
    width: typeof window !== 'undefined' ? getOptimalPanelWidth() : 900,
    dragStartX: 0,
    isDragging: false,
  });

  /**
   * Start dragging
   */
  const startDrag = useCallback((clientX: number) => {
    setLayout((prev) => ({
      ...prev,
      dragStartX: clientX,
      isDragging: true,
    }));
  }, []);

  /**
   * Handle drag movement
   */
  const onDrag = useCallback(
    (clientX: number) => {
      if (!layout.isDragging) return;

      const newWidth = calculatePanelWidth(layout.width, layout.dragStartX, clientX);

      setLayout((prev) => ({
        ...prev,
        width: newWidth,
        dragStartX: clientX,
      }));
    },
    [layout.isDragging, layout.width, layout.dragStartX]
  );

  /**
   * Stop dragging
   */
  const stopDrag = useCallback(() => {
    setLayout((prev) => ({
      ...prev,
      isDragging: false,
    }));
  }, []);

  /**
   * Handle window resize to adjust optimal width
   */
  useEffect(() => {
    const handleResize = () => {
      if (!layout.isDragging) {
        setLayout((prev) => ({
          ...prev,
          width: getOptimalPanelWidth(),
        }));
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [layout.isDragging]);

  /**
   * Set up global drag listeners
   */
  useEffect(() => {
    if (!layout.isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      onDrag(e.clientX);
    };

    const handleMouseUp = () => {
      stopDrag();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [layout.isDragging, onDrag, stopDrag]);

  return {
    layout,
    startDrag,
    stopDrag,
  };
}

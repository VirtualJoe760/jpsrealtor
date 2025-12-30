"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';

/**
 * Tutorial Overlay Component
 * Provides dark backdrop and spotlight effect on target elements
 */

interface TutorialOverlayProps {
  /** CSS selector for element to highlight (optional) */
  target?: string;

  /** Hide dark backdrop overlay? */
  hideOverlay?: boolean;
}

export function TutorialOverlay({ target, hideOverlay }: TutorialOverlayProps) {
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const updatePosition = () => {
      if (target) {
        const element = document.querySelector(target);
        if (element) {
          // Check if targeting swipe buttons - show full panel
          const isSwipeButton = target === '[data-tour="swipe-right-button"]' || target === '[data-tour="swipe-left-button"]';

          if (isSwipeButton) {
            // Find the listing panel - look for the motion.div wrapper that contains both buttons
            // The panel structure has swipe buttons near the bottom
            let panel = element.closest('.fixed.bottom-0');

            // If that doesn't work, look for parent with both swipe buttons
            if (!panel) {
              let current = element.parentElement;
              let attempts = 0;
              while (current && attempts < 10) {
                const hasLeftButton = current.querySelector('[data-tour="swipe-left-button"]');
                const hasRightButton = current.querySelector('[data-tour="swipe-right-button"]');
                if (hasLeftButton && hasRightButton) {
                  panel = current;
                  break;
                }
                current = current.parentElement;
                attempts++;
              }
            }

            if (panel) {
              setHighlightRect(panel.getBoundingClientRect());
              setButtonRect(element.getBoundingClientRect());
              console.log('[TutorialOverlay] Found listing panel for swipe button', {
                panelRect: panel.getBoundingClientRect(),
                buttonRect: element.getBoundingClientRect()
              });
            } else {
              console.warn('[TutorialOverlay] Could not find listing panel, highlighting button only');
              setHighlightRect(element.getBoundingClientRect());
              setButtonRect(null);
            }
          } else {
            setHighlightRect(element.getBoundingClientRect());
            setButtonRect(null);
          }
        } else {
          console.warn(`[TutorialOverlay] Target element not found: ${target}`);
          setHighlightRect(null);
          setButtonRect(null);
        }
      } else {
        setHighlightRect(null);
        setButtonRect(null);
      }
    };

    // Initial position
    updatePosition();

    // Update on scroll and resize
    window.addEventListener('scroll', updatePosition, true); // Use capture to catch all scrolls
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [target]);

  if (!mounted) return null;

  const content = (
    <>
      {/* Dark backdrop - only shown when no target (fromAvatar steps) */}
      {!hideOverlay && !target && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 pointer-events-none"
          style={{ zIndex: 999997 }} // Below avatar but above everything else
        />
      )}

      {/* Spotlight on target element - box-shadow creates dark overlay with cutout */}
      {target && highlightRect && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{ zIndex: 999998 }}
        >
          {/* Panel/element cutout - creates the undimmed area */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`absolute rounded-xl ${!buttonRect ? 'border-4 border-emerald-400' : ''}`}
            style={{
              top: highlightRect.top - 8,
              left: highlightRect.left - 8,
              width: highlightRect.width + 16,
              height: highlightRect.height + 16,
              boxShadow: !buttonRect
                ? '0 0 0 9999px rgba(0, 0, 0, 0.7), 0 0 20px 5px rgba(16, 185, 129, 0.5)' // Dark overlay + glow for regular elements
                : '0 0 0 9999px rgba(0, 0, 0, 0.7)', // Just dark overlay for swipe buttons (glow on button instead)
            }}
          />

          {/* Button highlight ring (only shown when buttonRect exists - swipe buttons) */}
          {buttonRect && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute border-4 border-emerald-400 rounded-xl"
              style={{
                top: buttonRect.top - 8,
                left: buttonRect.left - 8,
                width: buttonRect.width + 16,
                height: buttonRect.height + 16,
                boxShadow: '0 0 20px 5px rgba(16, 185, 129, 0.5)', // Emerald glow on button
              }}
            />
          )}
        </div>
      )}
    </>
  );

  return createPortal(content, document.body);
}

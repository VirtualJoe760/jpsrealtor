/**
 * Contact Bottom Panel
 *
 * Tinder-style swipe interface for organizing contacts.
 * Allows users to swipe through contacts and assign them to labels/campaigns.
 *
 * Features:
 * - Swipe gestures (touch + mouse)
 * - Card stack with smooth animations
 * - Undo last action
 * - Progress tracking
 * - Label selection
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import ContactCard from './ContactCard';
import {
  XMarkIcon,
  CheckIcon,
  ArrowUturnLeftIcon,
  FolderIcon,
} from '@heroicons/react/24/outline';

// ========================================
// SWIPE CONSTANTS
// ========================================

/** Minimum horizontal distance (px) to trigger a swipe */
const SWIPE_THRESHOLD = 100;

/** Divisor for calculating card rotation based on drag distance */
const ROTATION_DIVISOR = 20;

/** Divisor for calculating card opacity fade during drag */
const OPACITY_DIVISOR = 500;

/** Vertical offset (px) between stacked cards */
const CARD_OFFSET = 10;

/** Number of cards visible in the stack (current + background) */
const VISIBLE_CARDS = 3;

/** Maximum width of card container (px) */
const MAX_CARD_WIDTH = 500;

// ========================================
// TYPES
// ========================================

interface Contact {
  _id: string;
  firstName: string;
  lastName: string;
  organization?: string;
  phones?: Array<{
    number: string;
    label: string;
    isPrimary: boolean;
  }>;
  phone?: string;
  emails?: Array<{
    address: string;
    label: string;
    isPrimary: boolean;
  }>;
  email?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  dataQuality?: {
    score: number;
    issues: string[];
  };
  isPersonal?: boolean;
  photo?: string;
}

interface Label {
  _id: string;
  name: string;
  color: string;
  icon?: string;
}

interface ContactBottomPanelProps {
  contacts: Contact[];
  labels: Label[];
  onSwipeLeft?: (contact: Contact) => void;
  onSwipeRight?: (contact: Contact, labelId: string) => void;
  onComplete?: () => void;
}

export default function ContactBottomPanel({
  contacts,
  labels,
  onSwipeLeft,
  onSwipeRight,
  onComplete,
}: ContactBottomPanelProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLabelId, setSelectedLabelId] = useState<string>(labels[0]?._id || '');
  const [history, setHistory] = useState<Array<{ contact: Contact; action: 'left' | 'right' }>>([]);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });

  const currentContact = contacts[currentIndex];
  const progress = contacts.length > 0 ? Math.round((currentIndex / contacts.length) * 100) : 0;
  const remaining = contacts.length - currentIndex;

  // Handle swipe completion
  const handleSwipe = (direction: 'left' | 'right') => {
    if (!currentContact) return;

    // Add to history for undo
    setHistory(prev => [...prev, { contact: currentContact, action: direction }]);

    // Call callbacks
    if (direction === 'left') {
      onSwipeLeft?.(currentContact);
    } else {
      onSwipeRight?.(currentContact, selectedLabelId);
    }

    // Move to next card
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);

    // Check if complete
    if (nextIndex >= contacts.length) {
      onComplete?.();
    }

    // Reset drag state
    setDragOffset({ x: 0, y: 0 });
    setIsDragging(false);
  };

  // Handle undo
  const handleUndo = () => {
    if (history.length === 0 || currentIndex === 0) return;

    const lastAction = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setCurrentIndex(prev => prev - 1);
  };

  // Mouse/Touch event handlers
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startPos.current = { x: clientX, y: clientY };
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const deltaX = clientX - startPos.current.x;
    const deltaY = clientY - startPos.current.y;

    setDragOffset({ x: deltaX, y: deltaY });
  };

  const handleDragEnd = () => {
    if (!isDragging) return;

    if (Math.abs(dragOffset.x) > SWIPE_THRESHOLD) {
      if (dragOffset.x > 0) {
        handleSwipe('right');
      } else {
        handleSwipe('left');
      }
    } else {
      // Reset position
      setDragOffset({ x: 0, y: 0 });
      setIsDragging(false);
    }
  };

  // Calculate card transform
  const getCardStyle = (offset: number = 0): React.CSSProperties => {
    const rotation = dragOffset.x / ROTATION_DIVISOR;
    const opacity = 1 - Math.abs(dragOffset.x) / OPACITY_DIVISOR;

    return {
      transform: `translateX(${dragOffset.x}px) translateY(${dragOffset.y}px) rotate(${rotation}deg) translateY(${offset}px)`,
      opacity: isDragging ? opacity : 1,
      transition: isDragging ? 'none' : 'all 0.3s ease-out',
      zIndex: 20 - offset,
      position: 'absolute',
      width: '100%',
      maxWidth: `${MAX_CARD_WIDTH}px`,
    };
  };

  // If no contacts, show completion message
  if (contacts.length === 0 || currentIndex >= contacts.length) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
        <div className="bg-white rounded-t-3xl p-8 w-full max-w-2xl mx-auto shadow-2xl">
          <div className="text-center py-12">
            <CheckIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">All Done!</h3>
            <p className="text-gray-600">
              You've reviewed all {contacts.length} contacts.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
      <div className="bg-white rounded-t-3xl p-6 w-full max-w-2xl mx-auto shadow-2xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Organize Contacts</h3>
              <p className="text-sm text-gray-600">{remaining} contacts remaining</p>
            </div>
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Undo last action"
            >
              <ArrowUturnLeftIcon className="h-6 w-6 text-gray-700" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 text-right mt-1">{progress}% complete</div>
        </div>

        {/* Label Selector */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Swipe right to add to:
          </label>
          <div className="flex flex-wrap gap-2">
            {labels.map(label => (
              <button
                key={label._id}
                onClick={() => setSelectedLabelId(label._id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedLabelId === label._id
                    ? 'bg-blue-600 text-white shadow-md scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={
                  selectedLabelId === label._id
                    ? { backgroundColor: label.color }
                    : {}
                }
              >
                {label.name}
              </button>
            ))}
          </div>
        </div>

        {/* Card Stack */}
        <div className="relative h-96 mb-6">
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Show next cards behind current */}
            {contacts.slice(currentIndex, currentIndex + VISIBLE_CARDS).map((contact, idx) => {
              if (idx === 0) {
                // Current card - draggable
                return (
                  <div
                    key={contact._id}
                    ref={cardRef}
                    style={getCardStyle(0)}
                    onMouseDown={handleDragStart}
                    onMouseMove={handleDragMove}
                    onMouseUp={handleDragEnd}
                    onMouseLeave={handleDragEnd}
                    onTouchStart={handleDragStart}
                    onTouchMove={handleDragMove}
                    onTouchEnd={handleDragEnd}
                  >
                    <ContactCard
                      contact={contact}
                      isDragging={isDragging}
                    />
                  </div>
                );
              } else {
                // Background cards - not draggable
                return (
                  <div
                    key={contact._id}
                    style={getCardStyle(idx * CARD_OFFSET)}
                    className="pointer-events-none"
                  >
                    <ContactCard
                      contact={contact}
                      className="opacity-50"
                    />
                  </div>
                );
              }
            })}
          </div>

          {/* Swipe Direction Indicators */}
          {isDragging && (
            <>
              {dragOffset.x > 50 && (
                <div className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg font-bold text-lg">
                  ADD ✓
                </div>
              )}
              {dragOffset.x < -50 && (
                <div className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg font-bold text-lg">
                  SKIP ✗
                </div>
              )}
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center space-x-8">
          <button
            onClick={() => handleSwipe('left')}
            className="w-16 h-16 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center transition-all hover:scale-110 shadow-lg"
          >
            <XMarkIcon className="h-8 w-8 text-red-600" />
          </button>

          <button
            onClick={() => handleSwipe('right')}
            className="w-20 h-20 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-all hover:scale-110 shadow-xl"
          >
            <CheckIcon className="h-10 w-10 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

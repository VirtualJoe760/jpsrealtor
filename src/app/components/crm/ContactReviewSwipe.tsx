'use client';

import { useState, useRef } from 'react';
import { X, Check, Edit2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

interface ReviewContact {
  rowIndex: number;
  data: {
    firstName?: string;
    lastName?: string;
    organization?: string;
    phone?: string;
    phone2?: string;
    phone3?: string;
    email?: string;
    email2?: string;
    email3?: string;
    address?: string;
    jobTitle?: string;
    website?: string;
    notes?: string;
    labels?: string;
  };
  issues: string[];
  confidence: number;
  action?: 'keep' | 'skip' | 'edit';
}

interface ContactReviewSwipeProps {
  contacts: ReviewContact[];
  isLight: boolean;
  onComplete: (decisions: Map<number, 'keep' | 'skip'>, editedContacts: Map<number, any>) => void;
  onBack: () => void;
}

export default function ContactReviewSwipe({
  contacts,
  isLight,
  onComplete,
  onBack,
}: ContactReviewSwipeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [decisions, setDecisions] = useState<Map<number, 'keep' | 'skip'>>(new Map());
  const [editedContacts, setEditedContacts] = useState<Map<number, any>>(new Map());
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});

  // Swipe state
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });

  const currentContact = contacts[currentIndex];
  const progress = contacts.length > 0 ? Math.round(((currentIndex + 1) / contacts.length) * 100) : 0;
  const remaining = contacts.length - currentIndex;

  // Swipe handlers
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (isEditing) return;
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startPos.current = { x: clientX, y: clientY };
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || isEditing) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const deltaX = clientX - startPos.current.x;
    const deltaY = clientY - startPos.current.y;

    setDragOffset({ x: deltaX, y: deltaY });
  };

  const handleDragEnd = () => {
    if (!isDragging || isEditing) return;

    const threshold = 100;

    if (Math.abs(dragOffset.x) > threshold) {
      if (dragOffset.x > 0) {
        handleKeep();
      } else {
        handleSkip();
      }
    } else {
      setDragOffset({ x: 0, y: 0 });
      setIsDragging(false);
    }
  };

  const handleSkip = () => {
    if (!currentContact) return;

    const newDecisions = new Map(decisions);
    newDecisions.set(currentContact.rowIndex, 'skip');
    setDecisions(newDecisions);
    moveToNext();
  };

  const handleKeep = () => {
    if (!currentContact) return;

    const newDecisions = new Map(decisions);
    newDecisions.set(currentContact.rowIndex, 'keep');
    setDecisions(newDecisions);

    // Save edited data if any
    if (Object.keys(editData).length > 0) {
      const newEdited = new Map(editedContacts);
      newEdited.set(currentContact.rowIndex, { ...(currentContact.data || {}), ...editData });
      setEditedContacts(newEdited);
      setEditData({});
    }

    moveToNext();
  };

  const moveToNext = () => {
    setDragOffset({ x: 0, y: 0 });
    setIsDragging(false);
    setIsEditing(false);

    if (currentIndex + 1 >= contacts.length) {
      // Completed review
      onComplete(decisions, editedContacts);
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleUndo = () => {
    if (currentIndex === 0) return;
    const prevIndex = currentIndex - 1;
    setCurrentIndex(prevIndex);
    // Remove decision for previous contact
    const newDecisions = new Map(decisions);
    newDecisions.delete(contacts[prevIndex].rowIndex);
    setDecisions(newDecisions);
  };

  const handleEditToggle = () => {
    if (!isEditing) {
      // Start editing - populate edit data
      setEditData({ ...(currentContact?.data || {}) });
    }
    setIsEditing(!isEditing);
  };

  const handleFieldChange = (field: string, value: string) => {
    setEditData({ ...editData, [field]: value });
  };

  // Card transform style
  const getCardStyle = (): React.CSSProperties => {
    const rotation = dragOffset.x / 20;
    const opacity = 1 - Math.abs(dragOffset.x) / 500;

    return {
      transform: `translateX(${dragOffset.x}px) translateY(${dragOffset.y}px) rotate(${rotation}deg)`,
      opacity: isDragging ? opacity : 1,
      transition: isDragging ? 'none' : 'all 0.3s ease-out',
    };
  };

  if (!currentContact) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <Check className={`w-16 h-16 mx-auto mb-4 ${isLight ? 'text-green-600' : 'text-green-400'}`} />
          <h3 className={`text-xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Review Complete!
          </h3>
          <p className={`mt-2 ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
            You've reviewed all {contacts.length} contacts.
          </p>
        </div>
      </div>
    );
  }

  const displayData = isEditing ? editData : (currentContact?.data || {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`p-4 rounded-lg border ${
        isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-900/20 border-amber-500/50'
      }`}>
        <div className="flex items-start gap-3">
          <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
            isLight ? 'text-amber-600' : 'text-amber-400'
          }`} />
          <div className={`text-sm ${isLight ? 'text-amber-800' : 'text-amber-300'}`}>
            <p className="font-semibold mb-1">Review Required</p>
            <p>
              These {contacts.length} contacts have issues or low confidence. Swipe right to keep, left to skip, or edit to fix.
            </p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-medium ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
            Contact {currentIndex + 1} of {contacts.length}
          </span>
          <span className={`text-sm ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
            {remaining} remaining
          </span>
        </div>
        <div className={`w-full h-2 rounded-full overflow-hidden ${
          isLight ? 'bg-slate-200' : 'bg-gray-700'
        }`}>
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Card Container */}
      <div className="relative h-[500px] flex items-center justify-center">
        {/* Swipe Direction Indicators */}
        {isDragging && (
          <>
            {dragOffset.x > 50 && (
              <div className="absolute top-1/2 right-8 transform -translate-y-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg font-bold text-lg z-10">
                KEEP ✓
              </div>
            )}
            {dragOffset.x < -50 && (
              <div className="absolute top-1/2 left-8 transform -translate-y-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg font-bold text-lg z-10">
                SKIP ✗
              </div>
            )}
          </>
        )}

        {/* Contact Card */}
        <div
          className={`w-full max-w-2xl rounded-xl shadow-xl border-2 ${
            isLight ? 'bg-white border-slate-200' : 'bg-gray-800 border-gray-700'
          }`}
          style={getCardStyle()}
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
        >
          {/* Card Header - Confidence Badge */}
          <div className={`px-4 py-3 border-b flex items-center justify-between ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-gray-900 border-gray-700'
          }`}>
            <div className="flex items-center gap-2">
              <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                currentContact.confidence >= 0.7
                  ? isLight ? 'bg-yellow-100 text-yellow-800' : 'bg-yellow-900/30 text-yellow-400'
                  : isLight ? 'bg-red-100 text-red-800' : 'bg-red-900/30 text-red-400'
              }`}>
                {Math.round(currentContact.confidence * 100)}% Confidence
              </div>
              <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                isLight ? 'bg-amber-100 text-amber-800' : 'bg-amber-900/30 text-amber-400'
              }`}>
                {currentContact.issues.length} {currentContact.issues.length === 1 ? 'Issue' : 'Issues'}
              </div>
            </div>
            <button
              onClick={handleEditToggle}
              className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                isEditing
                  ? isLight
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-600 text-white'
                  : isLight
                  ? 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                  : 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
              }`}
            >
              <Edit2 className="w-4 h-4" />
              {isEditing ? 'Done' : 'Edit'}
            </button>
          </div>

          {/* Contact Data - PRIMARY CONTENT */}
          <div className="p-6 space-y-4 max-h-[350px] overflow-y-auto">
            {Object.keys(displayData || {})
              .filter(field => !field.startsWith('_')) // Skip internal fields
              .sort((a, b) => {
                // Define custom sort order - put important fields first
                const order = [
                  'firstName', 'lastName', 'organization', 'jobTitle',
                  'phone', 'phone2', 'phone3',
                  'email', 'email2', 'email3',
                  'address', 'city', 'state', 'zip',
                  'beds', 'baths', 'sqft', 'soldPrice', 'price',
                  'latitude', 'longitude', 'lat', 'long', 'lng',
                  'propertyType', 'yearBuilt', 'lotSize',
                  'labels', 'website', 'notes'
                ];
                const indexA = order.indexOf(a);
                const indexB = order.indexOf(b);
                if (indexA === -1 && indexB === -1) return a.localeCompare(b);
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;
                return indexA - indexB;
              })
              .map((field) => {
                const value = displayData[field];
                if (!value && !isEditing) return null;

                // Generate human-readable label from field name
                const label = field
                  .replace(/([A-Z])/g, ' $1') // Add space before capital letters
                  .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
                  .replace(/([a-z])(\d)/g, '$1 $2') // Add space before numbers
                  .trim();

                return (
                  <div key={field}>
                    <label className={`text-xs font-medium block mb-1 ${
                      isLight ? 'text-slate-600' : 'text-gray-400'
                    }`}>
                      {label}
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={value || ''}
                        onChange={(e) => handleFieldChange(field, e.target.value)}
                        className={`w-full px-3 py-2 rounded border text-sm ${
                          isLight
                            ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                            : 'bg-gray-700 border-gray-600 text-white focus:border-blue-400'
                        } focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                        placeholder={`Enter ${label.toLowerCase()}`}
                      />
                    ) : (
                      <p className={`text-sm ${
                        field.includes('phone') || field.includes('email') || field.includes('website') ? 'font-mono' : ''
                      } ${
                        isLight ? 'text-slate-900' : 'text-gray-200'
                      }`}>
                        {value || '—'}
                      </p>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleUndo}
          disabled={currentIndex === 0}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            currentIndex === 0
              ? isLight
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-gray-800 text-gray-600 cursor-not-allowed'
              : isLight
              ? 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              : 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          Undo
        </button>

        <div className="flex items-center gap-4">
          <button
            onClick={handleSkip}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-lg ${
              isLight
                ? 'bg-red-100 hover:bg-red-200 text-red-600'
                : 'bg-red-900/30 hover:bg-red-900/50 text-red-400'
            }`}
          >
            <X className="w-8 h-8" />
          </button>

          <button
            onClick={handleKeep}
            className="w-20 h-20 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-all hover:scale-110 shadow-xl"
          >
            <Check className="w-10 h-10 text-white" />
          </button>
        </div>

        <button
          onClick={onBack}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            isLight
              ? 'text-slate-600 hover:bg-slate-100'
              : 'text-gray-400 hover:bg-gray-700'
          }`}
        >
          Back
        </button>
      </div>
    </div>
  );
}

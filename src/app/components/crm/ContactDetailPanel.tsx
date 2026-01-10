'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import PropertyMap to avoid SSR issues with Leaflet
const PropertyMap = dynamic(() => import('./PropertyMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[300px] bg-gray-100 dark:bg-gray-800 rounded-lg">
      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
    </div>
  )
});

interface ReviewContact {
  rowIndex: number;
  data: any;
  issues: string[];
  confidence: number;
}

interface ContactDetailPanelProps {
  contact: ReviewContact;
  isOpen: boolean;
  onClose: () => void;
  onKeep: () => void;
  onSkip: () => void;
  onEdit: (updatedData: any) => void;
  isLight: boolean;
}

export default function ContactDetailPanel({
  contact,
  isOpen,
  onClose,
  onKeep,
  onSkip,
  onEdit,
  isLight
}: ContactDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(contact.data);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);

  // Update edited data when contact changes
  useEffect(() => {
    setEditedData(contact.data);
    setIsEditing(false);
  }, [contact]);

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

  const handleSaveEdit = () => {
    onEdit(editedData);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedData(contact.data);
    setIsEditing(false);
  };

  const handleFieldChange = (field: string, value: string) => {
    setEditedData({ ...editedData, [field]: value });
  };

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-100';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  // Get display name
  const displayName =
    [editedData.firstName, editedData.lastName].filter(Boolean).join(' ') ||
    editedData.organization ||
    'Unknown Contact';

  // Organize fields into sections
  const contactFields = ['phone', 'phone2', 'phone3', 'email', 'email2', 'email3'];
  const addressFields = ['address', 'city', 'state', 'zip', 'county'];
  const propertyFields = [
    'beds',
    'baths',
    'sqft',
    'lotSize',
    'yearBuilt',
    'propertyType',
    'price',
    'soldPrice',
    'purchasePrice',
    'purchaseDate',
    'numberOfUnits',
    'numberOfStories',
    'garage',
    'fireplace',
    'pool',
    'view',
    'acreage',
    'apn',
    'subdivision',
    'zoning',
    'assessedValue',
    'marketValue',
    'ownerOccupied'
  ];

  const getFieldsInSection = (fields: string[]) => {
    return fields
      .filter(field => editedData[field])
      .map(field => ({ field, value: editedData[field] }));
  };

  const getRemainingFields = () => {
    const usedFields = new Set([
      'firstName',
      'lastName',
      'organization',
      'latitude',
      'longitude',
      'lat',
      'long',
      'lng',
      ...contactFields,
      ...addressFields,
      ...propertyFields
    ]);

    return Object.keys(editedData)
      .filter(field => !field.startsWith('_') && !usedFields.has(field) && editedData[field])
      .map(field => ({ field, value: editedData[field] }));
  };

  // Format field label
  const formatFieldLabel = (field: string) => {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  // Get coordinates
  const latitude =
    parseFloat(editedData.latitude || editedData.lat) || undefined;
  const longitude =
    parseFloat(editedData.longitude || editedData.long || editedData.lng) ||
    undefined;
  const fullAddress = [editedData.address, editedData.city, editedData.state, editedData.zip]
    .filter(Boolean)
    .join(', ');

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl shadow-2xl transform transition-transform duration-300 ease-out ${
          isLight ? 'bg-white' : 'bg-gray-900'
        }`}
        style={{
          maxHeight: '85vh',
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)'
        }}
      >
        {/* Drag Handle */}
        <div
          ref={dragHandleRef}
          className={`flex justify-center items-center py-3 cursor-grab active:cursor-grabbing ${
            isLight ? 'bg-gray-50 border-b border-gray-200' : 'bg-gray-800 border-b border-gray-700'
          }`}
        >
          <div className={`w-12 h-1 rounded-full ${isLight ? 'bg-gray-300' : 'bg-gray-600'}`} />
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 140px)' }}>
          <div className="p-6 space-y-6">
            {/* HEADER */}
            <div className={`p-4 rounded-lg ${isLight ? 'bg-gray-50' : 'bg-gray-800'}`}>
              <div className="flex items-start justify-between mb-2">
                <h2 className={`text-2xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  {displayName}
                </h2>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${getConfidenceColor(
                    contact.confidence
                  )}`}
                >
                  {contact.confidence}% Match
                </span>
              </div>

              {/* Issues */}
              {contact.issues.length > 0 && (
                <div className="mt-3">
                  <p
                    className={`text-sm font-medium mb-2 ${
                      isLight ? 'text-gray-700' : 'text-gray-300'
                    }`}
                  >
                    Issues ({contact.issues.length}):
                  </p>
                  <ul className="space-y-1">
                    {contact.issues.map((issue, index) => (
                      <li
                        key={index}
                        className={`text-sm flex items-start ${
                          isLight ? 'text-red-600' : 'text-red-400'
                        }`}
                      >
                        <span className="mr-2">•</span>
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* CONTACT INFORMATION */}
            {getFieldsInSection(contactFields).length > 0 && (
              <div>
                <h3
                  className={`text-lg font-semibold mb-3 flex items-center ${
                    isLight ? 'text-gray-900' : 'text-white'
                  }`}
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  Contact Information
                </h3>
                <div
                  className={`p-4 rounded-lg space-y-3 ${
                    isLight ? 'bg-gray-50' : 'bg-gray-800'
                  }`}
                >
                  {getFieldsInSection(contactFields).map(({ field, value }) => (
                    <div key={field}>
                      <label
                        className={`text-xs font-medium block mb-1 ${
                          isLight ? 'text-gray-500' : 'text-gray-400'
                        }`}
                      >
                        {formatFieldLabel(field)}
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={value}
                          onChange={e => handleFieldChange(field, e.target.value)}
                          className={`w-full px-3 py-2 rounded border ${
                            isLight
                              ? 'bg-white border-gray-300 text-gray-900'
                              : 'bg-gray-700 border-gray-600 text-white'
                          }`}
                        />
                      ) : (
                        <p className={`${isLight ? 'text-gray-900' : 'text-white'}`}>{value}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PROPERTY DETAILS */}
            {getFieldsInSection(propertyFields).length > 0 && (
              <div>
                <h3
                  className={`text-lg font-semibold mb-3 flex items-center ${
                    isLight ? 'text-gray-900' : 'text-white'
                  }`}
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                  Property Details
                </h3>
                <div
                  className={`p-4 rounded-lg grid grid-cols-2 gap-4 ${
                    isLight ? 'bg-gray-50' : 'bg-gray-800'
                  }`}
                >
                  {getFieldsInSection(propertyFields).map(({ field, value }) => (
                    <div key={field}>
                      <label
                        className={`text-xs font-medium block mb-1 ${
                          isLight ? 'text-gray-500' : 'text-gray-400'
                        }`}
                      >
                        {formatFieldLabel(field)}
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={value}
                          onChange={e => handleFieldChange(field, e.target.value)}
                          className={`w-full px-3 py-2 rounded border ${
                            isLight
                              ? 'bg-white border-gray-300 text-gray-900'
                              : 'bg-gray-700 border-gray-600 text-white'
                          }`}
                        />
                      ) : (
                        <p className={`${isLight ? 'text-gray-900' : 'text-white'}`}>{value}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LOCATION & MAP */}
            {(fullAddress || (latitude && longitude)) && (
              <div>
                <h3
                  className={`text-lg font-semibold mb-3 flex items-center ${
                    isLight ? 'text-gray-900' : 'text-white'
                  }`}
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Location
                </h3>
                <div
                  className={`p-4 rounded-lg space-y-4 ${
                    isLight ? 'bg-gray-50' : 'bg-gray-800'
                  }`}
                >
                  {fullAddress && (
                    <div>
                      <label
                        className={`text-xs font-medium block mb-1 ${
                          isLight ? 'text-gray-500' : 'text-gray-400'
                        }`}
                      >
                        Address
                      </label>
                      <p className={`${isLight ? 'text-gray-900' : 'text-white'}`}>
                        {fullAddress}
                      </p>
                    </div>
                  )}

                  {latitude && longitude && (
                    <PropertyMap
                      latitude={latitude}
                      longitude={longitude}
                      address={fullAddress}
                      height="300px"
                      isLight={isLight}
                    />
                  )}
                </div>
              </div>
            )}

            {/* ADDITIONAL FIELDS */}
            {getRemainingFields().length > 0 && (
              <div>
                <h3
                  className={`text-lg font-semibold mb-3 flex items-center ${
                    isLight ? 'text-gray-900' : 'text-white'
                  }`}
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Additional Information
                </h3>
                <div
                  className={`p-4 rounded-lg grid grid-cols-2 gap-4 ${
                    isLight ? 'bg-gray-50' : 'bg-gray-800'
                  }`}
                >
                  {getRemainingFields().map(({ field, value }) => (
                    <div key={field}>
                      <label
                        className={`text-xs font-medium block mb-1 ${
                          isLight ? 'text-gray-500' : 'text-gray-400'
                        }`}
                      >
                        {formatFieldLabel(field)}
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={value}
                          onChange={e => handleFieldChange(field, e.target.value)}
                          className={`w-full px-3 py-2 rounded border ${
                            isLight
                              ? 'bg-white border-gray-300 text-gray-900'
                              : 'bg-gray-700 border-gray-600 text-white'
                          }`}
                        />
                      ) : (
                        <p className={`${isLight ? 'text-gray-900' : 'text-white'}`}>{value}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ACTION BAR (Fixed at bottom) */}
        <div
          className={`p-4 border-t ${
            isLight ? 'bg-white border-gray-200' : 'bg-gray-900 border-gray-700'
          }`}
        >
          {isEditing ? (
            <div className="flex gap-3">
              <button
                onClick={handleCancelEdit}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold ${
                  isLight
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 px-4 py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => setIsEditing(true)}
                className={`px-4 py-3 rounded-lg font-semibold flex items-center justify-center ${
                  isLight
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit
              </button>
              <button
                onClick={() => {
                  onSkip();
                  onClose();
                }}
                className="flex-1 px-4 py-3 rounded-lg font-semibold bg-red-600 text-white hover:bg-red-700 flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Skip
              </button>
              <button
                onClick={() => {
                  onKeep();
                  onClose();
                }}
                className="flex-1 px-4 py-3 rounded-lg font-semibold bg-green-600 text-white hover:bg-green-700 flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Keep
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

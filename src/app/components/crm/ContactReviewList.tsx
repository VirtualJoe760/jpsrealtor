'use client';

import React, { useState, useMemo } from 'react';
import ContactDetailPanel from './ContactDetailPanel';

interface ReviewContact {
  rowIndex: number;
  data: any;
  issues: string[];
  confidence: number;
}

interface ContactReviewListProps {
  contacts: ReviewContact[];
  isLight: boolean;
  onComplete: (decisions: Map<number, 'keep' | 'skip'>, editedContacts: Map<number, any>) => void;
  onBack: () => void;
  contactLabel?: string;
}

export default function ContactReviewList({
  contacts,
  isLight,
  onComplete,
  onBack,
  contactLabel
}: ContactReviewListProps) {
  const [selectedContact, setSelectedContact] = useState<ReviewContact | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [decisions, setDecisions] = useState<Map<number, 'keep' | 'skip'>>(new Map());
  const [editedContacts, setEditedContacts] = useState<Map<number, any>>(new Map());

  // Calculate progress
  const reviewedCount = decisions.size;
  const totalCount = contacts.length;

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-500';
    if (confidence >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getConfidenceBadgeColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-100';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  // Event handlers
  const handleContactClick = (contact: ReviewContact) => {
    // Use edited data if available
    const contactToShow = editedContacts.has(contact.rowIndex)
      ? { ...contact, data: editedContacts.get(contact.rowIndex) }
      : contact;

    setSelectedContact(contactToShow);
    setIsPanelOpen(true);
  };

  const handleKeep = (rowIndex: number) => {
    const newDecisions = new Map(decisions);
    newDecisions.set(rowIndex, 'keep');
    setDecisions(newDecisions);
  };

  const handleSkip = (rowIndex: number) => {
    const newDecisions = new Map(decisions);
    newDecisions.set(rowIndex, 'skip');
    setDecisions(newDecisions);
  };

  const handleEdit = (updatedData: any) => {
    if (!selectedContact) return;
    const newEdited = new Map(editedContacts);
    newEdited.set(selectedContact.rowIndex, updatedData);
    setEditedContacts(newEdited);

    // Update the selected contact to reflect changes
    setSelectedContact({ ...selectedContact, data: updatedData });
  };

  const handleKeepAll = () => {
    const newDecisions = new Map(decisions);
    contacts.forEach(contact => {
      newDecisions.set(contact.rowIndex, 'keep');
    });
    setDecisions(newDecisions);
  };

  const handleSkipAll = () => {
    const newDecisions = new Map(decisions);
    contacts.forEach(contact => {
      newDecisions.set(contact.rowIndex, 'skip');
    });
    setDecisions(newDecisions);
  };

  const handleComplete = () => {
    // Auto-keep unreviewed contacts
    const newDecisions = new Map(decisions);
    contacts.forEach(contact => {
      if (!newDecisions.has(contact.rowIndex)) {
        newDecisions.set(contact.rowIndex, 'keep');
      }
    });

    onComplete(newDecisions, editedContacts);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
    setTimeout(() => setSelectedContact(null), 300);
  };

  // Get display data for a contact
  const getContactDisplay = (contact: ReviewContact) => {
    const data = editedContacts.get(contact.rowIndex) || contact.data;
    const name =
      [data.firstName, data.lastName].filter(Boolean).join(' ') ||
      data.organization ||
      'Unknown Contact';
    const phone = data.phone || data.phone2 || data.phone3 || 'No phone';
    const address = [data.address, data.city, data.state].filter(Boolean).join(', ') || 'No address';

    return { name, phone, address };
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className={`flex items-center justify-between p-4 border-b ${
          isLight ? 'bg-white border-gray-200' : 'bg-gray-900 border-gray-700'
        }`}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className={`p-2 rounded-lg ${
              isLight ? 'hover:bg-gray-100' : 'hover:bg-gray-800'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div>
            <h2 className={`text-xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
              Review Contacts {contactLabel && `- ${contactLabel}`}
            </h2>
            <p className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
              {reviewedCount} of {totalCount} reviewed
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSkipAll}
            className={`px-4 py-2 rounded-lg font-medium text-sm ${
              isLight
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            Skip All
          </button>
          <button
            onClick={handleKeepAll}
            className="px-4 py-2 rounded-lg font-medium text-sm bg-green-600 text-white hover:bg-green-700"
          >
            ✓ Keep All
          </button>
        </div>
      </div>

      {/* Contact List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3 max-w-4xl mx-auto">
          {contacts.map(contact => {
            const { name, phone, address } = getContactDisplay(contact);
            const decision = decisions.get(contact.rowIndex);
            const isReviewed = decision !== undefined;

            return (
              <div
                key={contact.rowIndex}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  isLight
                    ? `bg-white hover:bg-gray-50 ${
                        isReviewed
                          ? decision === 'keep'
                            ? 'border-green-300 bg-green-50'
                            : 'border-red-300 bg-red-50'
                          : 'border-gray-200'
                      }`
                    : `bg-gray-800 hover:bg-gray-750 ${
                        isReviewed
                          ? decision === 'keep'
                            ? 'border-green-600 bg-green-900/20'
                            : 'border-red-600 bg-red-900/20'
                          : 'border-gray-700'
                      }`
                }`}
                onClick={() => handleContactClick(contact)}
              >
                <div className="flex items-start justify-between">
                  {/* Contact Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {/* Decision indicator */}
                      {isReviewed && (
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            decision === 'keep' ? 'bg-green-600' : 'bg-red-600'
                          }`}
                        >
                          {decision === 'keep' ? (
                            <svg
                              className="w-4 h-4 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-4 h-4 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          )}
                        </div>
                      )}

                      {/* Name */}
                      <h3
                        className={`text-lg font-semibold truncate ${
                          isLight ? 'text-gray-900' : 'text-white'
                        }`}
                      >
                        {name}
                      </h3>

                      {/* Confidence indicator dot */}
                      <div
                        className={`w-3 h-3 rounded-full ${getConfidenceColor(contact.confidence)}`}
                        title={`${contact.confidence}% confidence`}
                      />
                    </div>

                    {/* Phone */}
                    <p
                      className={`text-sm mb-1 flex items-center ${
                        isLight ? 'text-gray-600' : 'text-gray-300'
                      }`}
                    >
                      <svg
                        className="w-4 h-4 mr-2"
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
                      {phone}
                    </p>

                    {/* Address */}
                    <p
                      className={`text-sm flex items-center ${
                        isLight ? 'text-gray-600' : 'text-gray-300'
                      }`}
                    >
                      <svg
                        className="w-4 h-4 mr-2"
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
                      {address}
                    </p>

                    {/* Badges */}
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${getConfidenceBadgeColor(
                          contact.confidence
                        )}`}
                      >
                        {contact.confidence}%
                      </span>
                      {contact.issues.length > 0 && (
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            isLight ? 'bg-red-100 text-red-700' : 'bg-red-900/30 text-red-400'
                          }`}
                        >
                          {contact.issues.length} issue{contact.issues.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  {!isReviewed && (
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleSkip(contact.rowIndex);
                        }}
                        className="px-3 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700"
                        title="Skip this contact"
                      >
                        Skip
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleKeep(contact.rowIndex);
                        }}
                        className="px-3 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700"
                        title="Keep this contact"
                      >
                        Keep
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div
        className={`p-4 border-t ${
          isLight ? 'bg-white border-gray-200' : 'bg-gray-900 border-gray-700'
        }`}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              {reviewedCount === 0 && 'Click any contact to review in detail'}
              {reviewedCount > 0 &&
                reviewedCount < totalCount &&
                `${totalCount - reviewedCount} contacts remaining`}
              {reviewedCount === totalCount && 'All contacts reviewed! Ready to import.'}
            </p>
          </div>

          <button
            onClick={handleComplete}
            className="px-6 py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={reviewedCount === 0}
            title={
              reviewedCount === 0
                ? 'Review at least one contact to continue'
                : reviewedCount < totalCount
                ? 'Unreviewed contacts will be kept automatically'
                : 'Complete import'
            }
          >
            {reviewedCount === totalCount ? 'Import Contacts →' : 'Import Selected →'}
          </button>
        </div>
      </div>

      {/* Detail Panel */}
      {selectedContact && (
        <ContactDetailPanel
          contact={selectedContact}
          isOpen={isPanelOpen}
          onClose={closePanel}
          onKeep={() => {
            handleKeep(selectedContact.rowIndex);
            closePanel();
          }}
          onSkip={() => {
            handleSkip(selectedContact.rowIndex);
            closePanel();
          }}
          onEdit={handleEdit}
          isLight={isLight}
        />
      )}
    </div>
  );
}

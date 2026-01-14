'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ContactViewTab, type Contact } from './contact-view/types';
import { isMobileView } from './contact-view/utils';
import {
  usePanelLayout,
  useContactPhoto,
  useContactStatus,
  useContactNotes,
  useContactInfo,
  useComparables,
} from './contact-view/hooks';
import {
  ContactHeader,
  ContactInfo,
  ContactNotes,
  ContactProperties,
  ContactTabs,
  PanelActions,
  ContactMap,
} from './contact-view/components';

interface ContactViewPanelProps {
  contact: Contact;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMessage: () => void;
  isLight: boolean;
}

export default function ContactViewPanel({
  contact,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onMessage,
  isLight,
}: ContactViewPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);

  // Current tab state
  const [currentTab, setCurrentTab] = useState<ContactViewTab>(
    ContactViewTab.OVERVIEW
  );

  // Custom hooks for all functionality
  const { layout, startDrag, stopDrag } = usePanelLayout();

  const {
    currentPhoto,
    uploadingPhoto,
    uploadStatus,
    uploadPhoto,
    removePhoto,
    fileInputRef,
  } = useContactPhoto(contact);

  const {
    currentStatus,
    isEditingStatus,
    updatingStatus,
    updateStatus,
    startEditingStatus,
    cancelEditingStatus,
  } = useContactStatus(contact);

  const {
    notes,
    newNoteContent,
    showNewNoteForm,
    expandedNoteId,
    editingNoteId,
    editedNoteContent,
    savingNote,
    setNewNoteContent,
    toggleNewNoteForm,
    addNote,
    editNote,
    saveEditedNote,
    cancelEditNote,
    deleteNote,
    toggleExpandNote,
    setEditedNoteContent,
  } = useContactNotes(contact);

  const {
    isEditingContactInfo,
    editedPhones,
    editedEmails,
    savingContactInfo,
    startEditingContactInfo,
    saveContactInfo,
    cancelEditingContactInfo,
    addPhone,
    addEmail,
    removePhone,
    removeEmail,
    updatePhone,
    updateEmail,
  } = useContactInfo(contact);

  const { comparables, loadingComparables, fetchComparables, refetchComparables } =
    useComparables(contact);

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

  // Drag to close functionality (mobile)
  useEffect(() => {
    const handle = dragHandleRef.current;
    const panel = panelRef.current;
    if (!handle || !panel || !isMobileView()) return;

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
      if (diff > 0) {
        panel.style.transform = `translateY(${diff}px)`;
      }
    };

    const onDragEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      panel.style.transition = 'transform 0.3s ease-out';
      const diff = currentY - startY;
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

  // Fetch comparables on mount
  useEffect(() => {
    if (isOpen && currentTab === ContactViewTab.PROPERTIES) {
      fetchComparables();
    }
  }, [isOpen, currentTab, fetchComparables]);

  if (!isOpen) return null;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadPhoto(file);
    }
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const renderTabContent = () => {
    switch (currentTab) {
      case ContactViewTab.OVERVIEW:
        return (
          <div className="space-y-6">
            <ContactInfo
              contact={contact}
              isEditing={isEditingContactInfo}
              editedPhones={editedPhones}
              editedEmails={editedEmails}
              onStartEdit={startEditingContactInfo}
              onSaveEdit={saveContactInfo}
              onCancelEdit={cancelEditingContactInfo}
              onAddPhone={addPhone}
              onAddEmail={addEmail}
              onRemovePhone={removePhone}
              onRemoveEmail={removeEmail}
              onPhoneChange={updatePhone}
              onEmailChange={updateEmail}
            />
            <ContactMap contact={contact} />
          </div>
        );

      case ContactViewTab.PROPERTIES:
        return (
          <ContactProperties
            comparables={comparables}
            loading={loadingComparables}
            onRefresh={refetchComparables}
          />
        );

      case ContactViewTab.NOTES:
        return (
          <ContactNotes
            notes={notes}
            newNoteContent={newNoteContent}
            showNewNoteForm={showNewNoteForm}
            expandedNoteId={expandedNoteId}
            editingNoteId={editingNoteId}
            editedNoteContent={editedNoteContent}
            savingNote={savingNote}
            onNewNoteChange={setNewNoteContent}
            onToggleNewNoteForm={toggleNewNoteForm}
            onAddNote={addNote}
            onEditNote={editNote}
            onSaveEdit={saveEditedNote}
            onCancelEdit={cancelEditNote}
            onDeleteNote={deleteNote}
            onToggleExpand={toggleExpandNote}
            onEditedContentChange={setEditedNoteContent}
          />
        );

      case ContactViewTab.ACTIVITY:
        return (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            Activity history coming soon
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-40 ${
          isOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed right-0 top-0 h-full bg-white dark:bg-gray-800 shadow-2xl transition-transform duration-300 ease-out z-50 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: `${layout.width}px` }}
      >
        {/* Drag Handle (mobile) */}
        <div
          ref={dragHandleRef}
          className="md:hidden flex justify-center py-2 cursor-grab active:cursor-grabbing"
        >
          <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Content */}
        <div className="h-full overflow-y-auto p-6">
          {/* Header with avatar and status */}
          <ContactHeader
            contact={contact}
            currentPhoto={currentPhoto}
            currentStatus={currentStatus}
            isEditingStatus={isEditingStatus}
            onEditStatus={startEditingStatus}
            onPhotoClick={handlePhotoClick}
          />

          {/* Hidden file input for photo upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />

          {/* Action buttons */}
          <PanelActions
            onEdit={onEdit}
            onDelete={onDelete}
            onMessage={onMessage}
            onClose={onClose}
          />

          {/* Tabs */}
          <ContactTabs activeTab={currentTab} onTabChange={setCurrentTab} />

          {/* Tab content */}
          {renderTabContent()}
        </div>
      </div>
    </>
  );
}

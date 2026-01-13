import { useState } from 'react';
import type { Note } from '../types';

export function useContactNotes(contactId: string, initialNotes: Note[] = []) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [showNewNoteForm, setShowNewNoteForm] = useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;

    setSavingNote(true);
    try {
      const response = await fetch(`/api/crm/contacts/${contactId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNoteContent }),
      });

      const data = await response.json();
      if (data.success) {
        setNotes(data.noteHistory || []);
        setNewNoteContent('');
        setShowNewNoteForm(false);
      }
    } catch (error) {
      console.error('[useContactNotes] Error adding note:', error);
    } finally {
      setSavingNote(false);
    }
  };

  const handleEditNote = async (noteId: string) => {
    if (!editNoteContent.trim()) return;

    setSavingNote(true);
    try {
      const response = await fetch(`/api/crm/contacts/${contactId}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId, content: editNoteContent }),
      });

      const data = await response.json();
      if (data.success) {
        setNotes(data.noteHistory || []);
        setEditingNoteId(null);
        setEditNoteContent('');
      }
    } catch (error) {
      console.error('[useContactNotes] Error updating note:', error);
    } finally {
      setSavingNote(false);
    }
  };

  const startEditNote = (note: Note) => {
    setEditingNoteId(note._id);
    setEditNoteContent(note.content);
    setExpandedNoteId(note._id);
  };

  const cancelEditNote = () => {
    setEditingNoteId(null);
    setEditNoteContent('');
  };

  const toggleNoteExpand = (noteId: string) => {
    setExpandedNoteId(expandedNoteId === noteId ? null : noteId);
  };

  return {
    notes,
    newNoteContent,
    setNewNoteContent,
    showNewNoteForm,
    setShowNewNoteForm,
    expandedNoteId,
    editingNoteId,
    editNoteContent,
    setEditNoteContent,
    savingNote,
    handleAddNote,
    handleEditNote,
    startEditNote,
    cancelEditNote,
    toggleNoteExpand,
  };
}

// ContactNotes - Notes list with add/edit/delete functionality
import React from 'react';
import { ContactNote } from '../../types/index';
import { formatDateTime, getRelativeTime } from '../../utils/index';

interface ContactNotesProps {
  notes: ContactNote[];
  newNoteContent: string;
  showNewNoteForm: boolean;
  expandedNoteId: string | null;
  editingNoteId: string | null;
  editedNoteContent: string;
  savingNote: boolean;
  onNewNoteChange: (content: string) => void;
  onToggleNewNoteForm: () => void;
  onAddNote: () => void;
  onEditNote: (noteId: string) => void;
  onSaveEdit: (noteId: string) => void;
  onCancelEdit: () => void;
  onDeleteNote: (noteId: string) => void;
  onToggleExpand: (noteId: string) => void;
  onEditedContentChange: (content: string) => void;
}

export function ContactNotes({
  notes,
  newNoteContent,
  showNewNoteForm,
  expandedNoteId,
  editingNoteId,
  editedNoteContent,
  savingNote,
  onNewNoteChange,
  onToggleNewNoteForm,
  onAddNote,
  onEditNote,
  onSaveEdit,
  onCancelEdit,
  onDeleteNote,
  onToggleExpand,
  onEditedContentChange,
}: ContactNotesProps) {
  return (
    <div className="space-y-4">
      {/* Add Note Button/Form */}
      {!showNewNoteForm ? (
        <button
          onClick={onToggleNewNoteForm}
          className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors dark:border-gray-600 dark:text-gray-400"
          type="button"
        >
          + Add Note
        </button>
      ) : (
        <div className="space-y-2">
          <textarea
            value={newNoteContent}
            onChange={(e) => onNewNoteChange(e.target.value)}
            placeholder="Enter note content..."
            className="w-full px-3 py-2 border rounded-lg resize-none dark:bg-gray-700 dark:border-gray-600"
            rows={4}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={onAddNote}
              disabled={!newNoteContent.trim() || savingNote}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
            >
              {savingNote ? 'Saving...' : 'Save Note'}
            </button>
            <button
              onClick={onToggleNewNoteForm}
              disabled={savingNote}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400 py-8">
          No notes yet. Add your first note above.
        </p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => {
            const isExpanded = expandedNoteId === note._id;
            const isEditing = editingNoteId === note._id;
            const shouldTruncate = note.content.length > 150;

            return (
              <div
                key={note._id}
                className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editedNoteContent}
                      onChange={(e) => onEditedContentChange(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg resize-none dark:bg-gray-600 dark:border-gray-500"
                      rows={4}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => onSaveEdit(note._id)}
                        disabled={!editedNoteContent.trim() || savingNote}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        type="button"
                      >
                        {savingNote ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={onCancelEdit}
                        disabled={savingNote}
                        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-600"
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                      {shouldTruncate && !isExpanded
                        ? `${note.content.slice(0, 150)}...`
                        : note.content}
                    </p>
                    {shouldTruncate && (
                      <button
                        onClick={() => onToggleExpand(note._id)}
                        className="text-sm text-blue-600 hover:text-blue-700 mt-2"
                        type="button"
                      >
                        {isExpanded ? 'Show less' : 'Show more'}
                      </button>
                    )}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {getRelativeTime(note.createdAt)} • {formatDateTime(note.createdAt)}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onEditNote(note._id)}
                          className="text-xs text-blue-600 hover:text-blue-700"
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDeleteNote(note._id)}
                          className="text-xs text-red-600 hover:text-red-700"
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

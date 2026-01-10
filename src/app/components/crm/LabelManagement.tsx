/**
 * Label Management Component
 *
 * Manages labels for contact organization.
 * Features:
 * - Create new labels with color picker
 * - Edit existing labels
 * - Archive/delete labels
 * - View label usage statistics
 */

'use client';

import React, { useState } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  TagIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface Label {
  _id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  contactCount: number;
  isSystem: boolean;
  isArchived: boolean;
}

interface LabelManagementProps {
  labels: Label[];
  onCreateLabel?: (label: Omit<Label, '_id' | 'contactCount' | 'isSystem' | 'isArchived'>) => Promise<void>;
  onUpdateLabel?: (id: string, updates: Partial<Label>) => Promise<void>;
  onDeleteLabel?: (id: string) => Promise<void>;
}

// Predefined color palette
const COLOR_PALETTE = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#EAB308', // Yellow
  '#84CC16', // Lime
  '#22C55E', // Green
  '#10B981', // Emerald
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#0EA5E9', // Sky
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#A855F7', // Purple
  '#D946EF', // Fuchsia
  '#EC4899', // Pink
  '#F43F5E', // Rose
  '#64748B', // Slate
];

export default function LabelManagement({
  labels,
  onCreateLabel,
  onUpdateLabel,
  onDeleteLabel,
}: LabelManagementProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
  });

  const handleCreate = async () => {
    if (!formData.name.trim()) return;

    await onCreateLabel?.({
      name: formData.name.trim(),
      description: formData.description.trim(),
      color: formData.color,
    });

    setFormData({ name: '', description: '', color: '#3B82F6' });
    setIsCreating(false);
  };

  const handleUpdate = async (id: string) => {
    if (!formData.name.trim()) return;

    await onUpdateLabel?.(id, {
      name: formData.name.trim(),
      description: formData.description.trim(),
      color: formData.color,
    });

    setFormData({ name: '', description: '', color: '#3B82F6' });
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this label?')) return;
    await onDeleteLabel?.(id);
  };

  const startEdit = (label: Label) => {
    setFormData({
      name: label.name,
      description: label.description || '',
      color: label.color,
    });
    setEditingId(label._id);
    setIsCreating(false);
  };

  const cancelEdit = () => {
    setFormData({ name: '', description: '', color: '#3B82F6' });
    setEditingId(null);
    setIsCreating(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Labels</h3>
          <p className="text-sm text-gray-600">
            Organize your contacts with custom labels
          </p>
        </div>
        <button
          onClick={() => {
            setIsCreating(true);
            setEditingId(null);
            setFormData({ name: '', description: '', color: '#3B82F6' });
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>New Label</span>
        </button>
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingId) && (
        <div className="bg-gray-50 rounded-lg p-4 border-2 border-blue-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            {isCreating ? 'Create New Label' : 'Edit Label'}
          </h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Label Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Hot Leads, Past Clients"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={50}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this label"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={200}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTE.map((color) => (
                  <button
                    key={color}
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-8 h-8 rounded-full transition-all ${
                      formData.color === color
                        ? 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={cancelEdit}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => (isCreating ? handleCreate() : handleUpdate(editingId!))}
                disabled={!formData.name.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Create' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Labels List */}
      <div className="space-y-2">
        {labels.filter(l => !l.isArchived).map((label) => (
          <div
            key={label._id}
            className="bg-white rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: label.color }}
                >
                  <TagIcon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-gray-900">{label.name}</h4>
                    {label.isSystem && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                        System
                      </span>
                    )}
                  </div>
                  {label.description && (
                    <p className="text-sm text-gray-600 mt-0.5">{label.description}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {label.contactCount} contact{label.contactCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {!label.isSystem && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => startEdit(label)}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit label"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(label._id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete label"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {labels.filter(l => !l.isArchived).length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <TagIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h4 className="text-lg font-medium text-gray-900 mb-1">No labels yet</h4>
            <p className="text-gray-600 mb-4">Create your first label to organize contacts</p>
            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Create Label</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

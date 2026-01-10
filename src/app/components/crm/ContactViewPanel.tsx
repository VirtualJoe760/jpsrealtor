'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Edit, Trash2, MessageSquare, Mail, Phone, MapPin, Briefcase, Calendar, Tag, Home, Plus, ChevronDown, ChevronUp, Pencil, Save, X } from 'lucide-react';
import Map, { Marker } from '@vis.gl/react-maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

// MapTiler API Key for map styling
const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_API_KEY || "";
const MAP_STYLE = MAPTILER_KEY && MAPTILER_KEY !== "get_your_maptiler_key_here"
  ? `https://api.maptiler.com/maps/toner-v2/style.json?key=${MAPTILER_KEY}`
  : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

// Responsive panel width configuration
const OPTIMAL_PANEL_WIDTH = {
  sm: 500,   // Small tablets
  md: 550,   // Medium tablets
  lg: 600,   // Laptops
  xl: 700,   // Larger laptops
  "2xl": 900, // Large desktop
};

function getOptimalPanelWidth(): number {
  if (typeof window === 'undefined') return 900;
  const w = window.innerWidth;
  if (w < 640) return w; // Mobile: full width
  if (w < 1024) return OPTIMAL_PANEL_WIDTH.sm;
  if (w < 1280) return OPTIMAL_PANEL_WIDTH.md;
  if (w < 1536) return OPTIMAL_PANEL_WIDTH.lg;
  if (w < 1920) return OPTIMAL_PANEL_WIDTH.xl;
  return OPTIMAL_PANEL_WIDTH["2xl"];
}

interface Contact {
  _id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  nickname?: string;
  email?: string;
  alternateEmails?: string[];
  phone: string;
  alternatePhones?: string[];
  birthday?: string;
  photo?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  alternateAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  organization?: string;
  jobTitle?: string;
  department?: string;
  website?: string;
  status?: string;
  tags?: string[];
  labels?: string[];
  notes?: string;
  createdAt: string;
  importedAt?: string;
  lastContactDate?: string;
  [key: string]: any; // Allow additional fields
}

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
  isLight
}: ContactViewPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);

  // Layout state for responsive width and positioning
  const [layout, setLayout] = useState({
    width: typeof window !== 'undefined' ? getOptimalPanelWidth() : 900,
    left: 0,
  });

  // Comparables state
  const [comparables, setComparables] = useState<any[]>([]);
  const [loadingComparables, setLoadingComparables] = useState(false);

  // Notes state
  const [notes, setNotes] = useState<any[]>(contact.noteHistory || []);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [showNewNoteForm, setShowNewNoteForm] = useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Status state
  const [currentStatus, setCurrentStatus] = useState(contact.status || 'uncontacted');
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Update layout on window resize
  useEffect(() => {
    const updateLayout = () => {
      const optimalWidth = getOptimalPanelWidth();
      const w = window.innerWidth;
      const left = w < 640 ? 0 : (w - optimalWidth) / 2; // Center on larger screens
      setLayout({ width: optimalWidth, left });
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

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

  const displayName = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'Unknown Contact';

  // Get full address
  const fullAddress = contact.address
    ? [contact.address.street, contact.address.city, contact.address.state, contact.address.zip]
        .filter(Boolean)
        .join(', ')
    : '';

  // Get coordinates if available
  const latitude = parseFloat((contact as any).latitude || (contact as any).lat) || undefined;
  const longitude = parseFloat((contact as any).longitude || (contact as any).long || (contact as any).lng) || undefined;

  // Fetch recent market activity when coordinates are available
  useEffect(() => {
    if (!isOpen || !latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      setComparables([]);
      return;
    }

    const fetchComparables = async () => {
      setLoadingComparables(true);
      try {
        const response = await fetch(
          `/api/crm/contacts/${contact._id}/comparables?latitude=${latitude}&longitude=${longitude}&radius=0.5&limit=10`
        );
        const data = await response.json();

        if (data.success) {
          setComparables(data.comparables || []);
          console.log('[ContactViewPanel] Loaded recent market activity:', data.comparables?.length);
        }
      } catch (error) {
        console.error('[ContactViewPanel] Error loading market activity:', error);
      } finally {
        setLoadingComparables(false);
      }
    };

    fetchComparables();
  }, [isOpen, latitude, longitude, contact._id]);

  // Debug logging
  console.log('[ContactViewPanel] Contact data:', {
    _id: contact._id,
    name: `${contact.firstName} ${contact.lastName}`,
    latitude: (contact as any).latitude,
    lat: (contact as any).lat,
    longitude: (contact as any).longitude,
    lng: (contact as any).lng,
    long: (contact as any).long,
    parsedLatitude: latitude,
    parsedLongitude: longitude,
    bedrooms: (contact as any).bedrooms,
    bedroomsTotal: (contact as any).bedroomsTotal,
    bathrooms: (contact as any).bathrooms,
    bathroomsFull: (contact as any).bathroomsFull,
    sqft: (contact as any).sqft,
    yearBuilt: (contact as any).yearBuilt,
    propertyType: (contact as any).propertyType,
    lotSize: (contact as any).lotSize,
    comparablesCount: comparables.length,
    allFields: Object.keys(contact).filter(k => !k.startsWith('_'))
  });

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Determine if a listing is a rental based on status
  const isRental = (comp: any) => {
    const status = (comp.standardStatus || comp.status || '').toLowerCase();
    return status.includes('lease') || status.includes('rent');
  };

  // Get marker color based on rental vs sale
  const getMarkerColor = (comp: any) => {
    // Blue for rentals, Green for sales
    return isRental(comp) ? 'text-blue-500' : 'text-green-500';
  };

  // Get transaction label
  const getTransactionLabel = (comp: any) => {
    return isRental(comp) ? 'Recently Rented' : 'Recently Sold';
  };

  // Status handler
  const handleStatusChange = async (newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const response = await fetch(`/api/crm/contacts/${contact._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (data.success) {
        setCurrentStatus(newStatus);
        setIsEditingStatus(false);
        console.log(`[ContactViewPanel] Updated contact status to: ${newStatus}`);
      } else {
        console.error('[ContactViewPanel] Failed to update status:', data.error);
        alert('Failed to update status: ' + data.error);
      }
    } catch (error) {
      console.error('[ContactViewPanel] Error updating status:', error);
      alert('Error updating status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Notes handlers
  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;

    setSavingNote(true);
    try {
      const response = await fetch(`/api/crm/contacts/${contact._id}/notes`, {
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
      console.error('[ContactViewPanel] Error adding note:', error);
    } finally {
      setSavingNote(false);
    }
  };

  const handleEditNote = async (noteId: string) => {
    if (!editNoteContent.trim()) return;

    setSavingNote(true);
    try {
      const response = await fetch(`/api/crm/contacts/${contact._id}/notes`, {
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
      console.error('[ContactViewPanel] Error updating note:', error);
    } finally {
      setSavingNote(false);
    }
  };

  const startEditNote = (note: any) => {
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
        className={`fixed bottom-0 z-50 rounded-t-2xl shadow-2xl transform transition-transform duration-300 ease-out ${
          isLight ? 'bg-white' : 'bg-gray-900'
        }`}
        style={{
          width: layout.width,
          left: layout.left,
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
            {/* STATUS BADGE - Top of Card */}
            <div className="flex justify-end">
              {isEditingStatus ? (
                <select
                  value={currentStatus}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  onBlur={() => setIsEditingStatus(false)}
                  disabled={updatingStatus}
                  autoFocus
                  className={`px-3 py-1 rounded-full text-sm font-semibold border-2 cursor-pointer ${
                    isLight
                      ? 'bg-white border-blue-500 text-gray-900'
                      : 'bg-gray-800 border-blue-400 text-white'
                  }`}
                >
                  <option value="uncontacted">Uncontacted</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="nurturing">Nurturing</option>
                  <option value="client">Client</option>
                  <option value="inactive">Inactive</option>
                </select>
              ) : (
                <button
                  onClick={() => setIsEditingStatus(true)}
                  className={`px-3 py-1 rounded-full text-sm font-semibold transition-all hover:ring-2 hover:ring-blue-500 ${
                    currentStatus === 'client'
                      ? 'bg-green-100 text-green-700'
                      : currentStatus === 'qualified'
                      ? 'bg-blue-100 text-blue-700'
                      : currentStatus === 'contacted'
                      ? 'bg-yellow-100 text-yellow-700'
                      : currentStatus === 'nurturing'
                      ? 'bg-purple-100 text-purple-700'
                      : currentStatus === 'inactive'
                      ? 'bg-red-100 text-red-700'
                      : isLight
                      ? 'bg-slate-100 text-slate-600'
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {currentStatus ? currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1) : 'Uncontacted'}
                </button>
              )}
            </div>

            {/* HEADER */}
            <div className={`p-4 rounded-lg ${isLight ? 'bg-gray-50' : 'bg-gray-800'}`}>
              <div className="flex items-start justify-between mb-2">
                <h2 className={`text-2xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  {displayName}
                </h2>
              </div>

              {/* Organization */}
              {contact.organization && (
                <div className={`flex items-center gap-2 text-sm ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
                  <Briefcase className="w-4 h-4" />
                  <span>{contact.organization}</span>
                  {contact.jobTitle && <span>• {contact.jobTitle}</span>}
                </div>
              )}
            </div>

            {/* CONTACT INFORMATION */}
            <div>
              <h3
                className={`text-lg font-semibold mb-3 flex items-center ${
                  isLight ? 'text-gray-900' : 'text-white'
                }`}
              >
                <Phone className="w-5 h-5 mr-2" />
                Contact Information
              </h3>
              <div
                className={`p-4 rounded-lg space-y-3 ${
                  isLight ? 'bg-gray-50' : 'bg-gray-800'
                }`}
              >
                {/* Phone Numbers - Grid Layout */}
                <div>
                  <label
                    className={`text-xs font-medium block mb-2 ${
                      isLight ? 'text-gray-500' : 'text-gray-400'
                    }`}
                  >
                    Phone Numbers
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {/* Enhanced phones array */}
                    {(contact as any).phones && (contact as any).phones.length > 0 ? (
                      (contact as any).phones.map((phoneObj: any, idx: number) => (
                        <a
                          key={idx}
                          href={`tel:${phoneObj.number}`}
                          className={`flex items-center gap-2 ${isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'}`}
                        >
                          <Phone className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{phoneObj.number}</span>
                          <span className={`text-xs px-2 py-0.5 rounded capitalize flex-shrink-0 ${
                            phoneObj.isPrimary
                              ? isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-900/30 text-blue-400'
                              : isLight ? 'bg-gray-100 text-gray-600' : 'bg-gray-700 text-gray-400'
                          }`}>
                            {phoneObj.isPrimary ? 'Primary' : phoneObj.label}
                          </span>
                        </a>
                      ))
                    ) : (
                      <>
                        {/* Fallback to legacy phone field */}
                        {contact.phone && (
                          <a
                            href={`tel:${contact.phone}`}
                            className={`flex items-center gap-2 ${isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'}`}
                          >
                            <Phone className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{contact.phone}</span>
                            <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-900/30 text-blue-400'}`}>
                              Primary
                            </span>
                          </a>
                        )}

                        {/* Alternate Phones (legacy) */}
                        {contact.alternatePhones && contact.alternatePhones.length > 0 && contact.alternatePhones.map((phone, idx) => (
                          <a
                            key={idx}
                            href={`tel:${phone}`}
                            className={`flex items-center gap-2 ${isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'}`}
                          >
                            <Phone className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{phone}</span>
                          </a>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                {/* Email Addresses - Grid Layout */}
                <div>
                  <label
                    className={`text-xs font-medium block mb-2 ${
                      isLight ? 'text-gray-500' : 'text-gray-400'
                    }`}
                  >
                    Email Addresses
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {/* Enhanced emails array */}
                    {(contact as any).emails && (contact as any).emails.length > 0 ? (
                      (contact as any).emails.map((emailObj: any, idx: number) => (
                        <a
                          key={idx}
                          href={`mailto:${emailObj.address}`}
                          className={`flex items-center gap-2 ${isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'}`}
                        >
                          <Mail className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{emailObj.address}</span>
                          <span className={`text-xs px-2 py-0.5 rounded capitalize flex-shrink-0 ${
                            emailObj.isPrimary
                              ? isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-900/30 text-blue-400'
                              : isLight ? 'bg-gray-100 text-gray-600' : 'bg-gray-700 text-gray-400'
                          }`}>
                            {emailObj.isPrimary ? 'Primary' : emailObj.label}
                          </span>
                        </a>
                      ))
                    ) : (
                      <>
                        {/* Fallback to legacy email field */}
                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            className={`flex items-center gap-2 ${isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'}`}
                          >
                            <Mail className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{contact.email}</span>
                            <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-900/30 text-blue-400'}`}>
                              Primary
                            </span>
                          </a>
                        )}

                        {/* Alternate Emails (legacy) */}
                        {contact.alternateEmails && contact.alternateEmails.length > 0 && contact.alternateEmails.map((email, idx) => (
                          <a
                            key={idx}
                            href={`mailto:${email}`}
                            className={`flex items-center gap-2 ${isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'}`}
                          >
                            <Mail className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{email}</span>
                          </a>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                {/* Website */}
                {contact.website && (
                  <div>
                    <label
                      className={`text-xs font-medium block mb-1 ${
                        isLight ? 'text-gray-500' : 'text-gray-400'
                      }`}
                    >
                      Website
                    </label>
                    <a
                      href={contact.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'}`}
                    >
                      {contact.website}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* NOTES */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-lg font-semibold flex items-center ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Notes
                </h3>
                {!showNewNoteForm && (
                  <button
                    onClick={() => setShowNewNoteForm(true)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Note
                  </button>
                )}
              </div>

              {/* New Note Form */}
              {showNewNoteForm && (
                <div className={`p-4 rounded-lg mb-3 ${isLight ? 'bg-gray-50' : 'bg-gray-800'}`}>
                  <textarea
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="Write your note here..."
                    rows={4}
                    className={`w-full p-3 rounded-lg border text-sm resize-none ${
                      isLight
                        ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                        : 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleAddNote}
                      disabled={!newNoteContent.trim() || savingNote}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <Save className="w-4 h-4" />
                      {savingNote ? 'Saving...' : 'Save Note'}
                    </button>
                    <button
                      onClick={() => {
                        setShowNewNoteForm(false);
                        setNewNoteContent('');
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        isLight
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          : 'bg-gray-700 text-white hover:bg-gray-600'
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Notes List */}
              {notes.length > 0 ? (
                <div className="space-y-2">
                  {notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((note) => (
                    <div
                      key={note._id}
                      className={`rounded-lg border ${
                        isLight ? 'bg-gray-50 border-gray-200' : 'bg-gray-800 border-gray-700'
                      }`}
                    >
                      {/* Note Header */}
                      <div
                        className={`flex items-center justify-between p-3 cursor-pointer ${
                          isLight ? 'hover:bg-gray-100' : 'hover:bg-gray-700'
                        }`}
                        onClick={() => editingNoteId !== note._id && toggleNoteExpand(note._id)}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          {expandedNoteId === note._id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                          <div>
                            <p className={`text-sm font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                              {new Date(note.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </p>
                            {note.updatedAt && (
                              <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                Edited {new Date(note.updatedAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                        {editingNoteId !== note._id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditNote(note);
                            }}
                            className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${
                              isLight ? 'text-gray-600' : 'text-gray-400'
                            }`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Note Content */}
                      {expandedNoteId === note._id && (
                        <div className="p-3 pt-0">
                          {editingNoteId === note._id ? (
                            <div>
                              <textarea
                                value={editNoteContent}
                                onChange={(e) => setEditNoteContent(e.target.value)}
                                rows={4}
                                className={`w-full p-3 rounded-lg border text-sm resize-none ${
                                  isLight
                                    ? 'bg-white border-gray-300 text-gray-900'
                                    : 'bg-gray-700 border-gray-600 text-white'
                                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                              />
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => handleEditNote(note._id)}
                                  disabled={!editNoteContent.trim() || savingNote}
                                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                >
                                  <Save className="w-4 h-4" />
                                  {savingNote ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  onClick={cancelEditNote}
                                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                                    isLight
                                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                      : 'bg-gray-700 text-white hover:bg-gray-600'
                                  } flex items-center gap-1`}
                                >
                                  <X className="w-4 h-4" />
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className={`text-sm whitespace-pre-wrap ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                              {note.content}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : !showNewNoteForm ? (
                <div className={`p-8 text-center rounded-lg ${isLight ? 'bg-gray-50' : 'bg-gray-800'}`}>
                  <MessageSquare className={`w-12 h-12 mx-auto mb-2 opacity-30 ${isLight ? 'text-gray-400' : 'text-gray-600'}`} />
                  <p className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                    No notes yet. Add your first note about this contact.
                  </p>
                </div>
              ) : null}
            </div>

            {/* PROPERTY INFORMATION */}
            {(fullAddress || (latitude && longitude)) && (
              <div>
                <h3
                  className={`text-lg font-semibold mb-3 flex items-center ${
                    isLight ? 'text-gray-900' : 'text-white'
                  }`}
                >
                  <Home className="w-5 h-5 mr-2" />
                  Property Information
                </h3>
                <div
                  className={`p-4 rounded-lg space-y-4 ${
                    isLight ? 'bg-gray-50' : 'bg-gray-800'
                  }`}
                >
                  {/* Address */}
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

                  {/* Purchase Price / Home Value */}
                  {((contact as any).purchasePrice || (contact as any).homeValue ||
                    (contact as any).propertyValue || (contact as any).salePrice ||
                    (contact as any).value || (contact as any).closePrice) && (
                    <div className="mb-4 grid grid-cols-2 gap-4">
                      {/* Purchase Price */}
                      <div>
                        <label
                          className={`text-xs font-medium block mb-1 ${
                            isLight ? 'text-gray-500' : 'text-gray-400'
                          }`}
                        >
                          Purchase Price
                        </label>
                        <p className={`text-2xl font-bold ${isLight ? 'text-green-600' : 'text-green-400'}`}>
                          ${Number(
                            (contact as any).purchasePrice ||
                            (contact as any).homeValue ||
                            (contact as any).propertyValue ||
                            (contact as any).salePrice ||
                            (contact as any).value ||
                            (contact as any).closePrice
                          ).toLocaleString()}
                        </p>
                      </div>

                      {/* Purchase Date */}
                      {(contact as any).purchaseDate && (
                        <div>
                          <label
                            className={`text-xs font-medium block mb-1 ${
                              isLight ? 'text-gray-500' : 'text-gray-400'
                            }`}
                          >
                            Purchase Date
                          </label>
                          <p className={`text-2xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                            {formatDate((contact as any).purchaseDate)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Property Details Grid */}
                  {((contact as any).bedrooms || (contact as any).bedroomsTotal ||
                    (contact as any).bathrooms || (contact as any).bathroomsFull ||
                    (contact as any).sqft || (contact as any).yearBuilt ||
                    (contact as any).propertyType || (contact as any).lotSize) && (
                    <div className="grid grid-cols-2 gap-4">
                      {/* Bedrooms */}
                      {((contact as any).bedrooms || (contact as any).bedroomsTotal) && (
                        <div>
                          <label
                            className={`text-xs font-medium block mb-1 ${
                              isLight ? 'text-gray-500' : 'text-gray-400'
                            }`}
                          >
                            Bedrooms
                          </label>
                          <p className={`${isLight ? 'text-gray-900' : 'text-white'}`}>
                            {(contact as any).bedrooms || (contact as any).bedroomsTotal}
                          </p>
                        </div>
                      )}

                      {/* Bathrooms */}
                      {((contact as any).bathrooms || (contact as any).bathroomsFull || (contact as any).bathroomsTotalDecimal) && (
                        <div>
                          <label
                            className={`text-xs font-medium block mb-1 ${
                              isLight ? 'text-gray-500' : 'text-gray-400'
                            }`}
                          >
                            Bathrooms
                          </label>
                          <p className={`${isLight ? 'text-gray-900' : 'text-white'}`}>
                            {(contact as any).bathrooms || (contact as any).bathroomsTotalDecimal || (contact as any).bathroomsFull}
                          </p>
                        </div>
                      )}

                      {/* Square Footage */}
                      {(contact as any).sqft && (
                        <div>
                          <label
                            className={`text-xs font-medium block mb-1 ${
                              isLight ? 'text-gray-500' : 'text-gray-400'
                            }`}
                          >
                            Square Feet
                          </label>
                          <p className={`${isLight ? 'text-gray-900' : 'text-white'}`}>
                            {Number((contact as any).sqft).toLocaleString()} sqft
                          </p>
                        </div>
                      )}

                      {/* Year Built */}
                      {(contact as any).yearBuilt && (
                        <div>
                          <label
                            className={`text-xs font-medium block mb-1 ${
                              isLight ? 'text-gray-500' : 'text-gray-400'
                            }`}
                          >
                            Year Built
                          </label>
                          <p className={`${isLight ? 'text-gray-900' : 'text-white'}`}>
                            {(contact as any).yearBuilt}
                          </p>
                        </div>
                      )}

                      {/* Property Type */}
                      {(contact as any).propertyType && (
                        <div>
                          <label
                            className={`text-xs font-medium block mb-1 ${
                              isLight ? 'text-gray-500' : 'text-gray-400'
                            }`}
                          >
                            Property Type
                          </label>
                          <p className={`${isLight ? 'text-gray-900' : 'text-white'}`}>
                            {(contact as any).propertyType}
                          </p>
                        </div>
                      )}

                      {/* Lot Size */}
                      {(contact as any).lotSize && (
                        <div>
                          <label
                            className={`text-xs font-medium block mb-1 ${
                              isLight ? 'text-gray-500' : 'text-gray-400'
                            }`}
                          >
                            Lot Size
                          </label>
                          <p className={`${isLight ? 'text-gray-900' : 'text-white'}`}>
                            {(contact as any).lotSize}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* MapLibre Map */}
                  {latitude && longitude && !isNaN(latitude) && !isNaN(longitude) && (
                    <div className="h-[400px] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                      <Map
                        initialViewState={{
                          latitude: latitude,
                          longitude: longitude,
                          zoom: 14
                        }}
                        style={{ width: '100%', height: '100%' }}
                        mapStyle={MAP_STYLE}
                        attributionControl={false}
                      >
                        {/* Subject Property Marker (Red) */}
                        <Marker
                          latitude={latitude}
                          longitude={longitude}
                          anchor="bottom"
                        >
                          <div className="relative cursor-pointer">
                            <MapPin className="w-8 h-8 text-red-500 drop-shadow-lg" fill="currentColor" />
                          </div>
                        </Marker>

                        {/* Recent Market Activity Markers (Blue for Rentals, Green for Sales) */}
                        {comparables.map((comp, idx) => (
                          <Marker
                            key={idx}
                            latitude={comp.latitude}
                            longitude={comp.longitude}
                            anchor="bottom"
                          >
                            <div className="relative cursor-pointer group">
                              <Home className={`w-6 h-6 ${getMarkerColor(comp)} drop-shadow-lg`} fill="currentColor" />
                              {/* Tooltip on hover (higher z-index to appear above markers) */}
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-[1000]">
                                <div className={`px-3 py-2 rounded-lg shadow-2xl whitespace-nowrap text-sm ${
                                  isLight ? 'bg-white border border-gray-200' : 'bg-gray-800 border border-gray-700'
                                }`}>
                                  {/* Transaction Type Badge */}
                                  <div className="mb-1">
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      isRental(comp)
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-green-100 text-green-700'
                                    }`}>
                                      {getTransactionLabel(comp)}
                                    </span>
                                  </div>
                                  {comp.closePrice ? (
                                    <p className={`font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                                      ${comp.closePrice.toLocaleString()}
                                    </p>
                                  ) : (
                                    <p className={`font-semibold ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                      Price N/A
                                    </p>
                                  )}
                                  <p className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
                                    {comp.bedsTotal || 'N/A'}bd • {comp.bathroomsTotalDecimal || comp.bathroomsFull || 'N/A'}ba
                                  </p>
                                  {comp.livingArea && (
                                    <p className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
                                      {comp.livingArea.toLocaleString()} sqft
                                    </p>
                                  )}
                                  <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                    {comp.distance} mi away
                                  </p>
                                </div>
                              </div>
                            </div>
                          </Marker>
                        ))}
                      </Map>
                    </div>
                  )}

                  {/* Map Not Available Message */}
                  {(!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) && (
                    <div className={`h-[200px] flex items-center justify-center rounded-lg border ${
                      isLight ? 'bg-gray-50 border-gray-200 text-gray-500' : 'bg-gray-800 border-gray-700 text-gray-400'
                    }`}>
                      <div className="text-center">
                        <MapPin className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Map coordinates not available</p>
                        <p className="text-xs mt-1">Add latitude/longitude to display map</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* RECENT MARKET ACTIVITY */}
            {latitude && longitude && !isNaN(latitude) && !isNaN(longitude) && (
              <div>
                <h3
                  className={`text-lg font-semibold mb-3 flex items-center ${
                    isLight ? 'text-gray-900' : 'text-white'
                  }`}
                >
                  <Home className="w-5 h-5 mr-2" />
                  Recent Market Activity
                  {loadingComparables && (
                    <div className="ml-2 animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  )}
                </h3>
                <div
                  className={`rounded-lg ${
                    isLight ? 'bg-gray-50' : 'bg-gray-800'
                  }`}
                >
                  {comparables.length > 0 ? (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {comparables.map((comp, idx) => (
                        <div
                          key={idx}
                          className={`p-4 hover:bg-opacity-50 transition-colors ${
                            isLight ? 'hover:bg-gray-100' : 'hover:bg-gray-700'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              {/* Address & Transaction Type */}
                              <div className="flex items-center gap-2 mb-1">
                                <p className={`font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                                  {comp.address}
                                </p>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  isRental(comp)
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                }`}>
                                  {getTransactionLabel(comp)}
                                </span>
                              </div>
                              {/* Property Details */}
                              <div className={`flex flex-wrap gap-3 text-sm ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
                                {comp.bedsTotal && (
                                  <span>{comp.bedsTotal} bd</span>
                                )}
                                {(comp.bathroomsTotalDecimal || comp.bathroomsFull) && (
                                  <span>• {comp.bathroomsTotalDecimal || comp.bathroomsFull} ba</span>
                                )}
                                {comp.livingArea && (
                                  <span>• {comp.livingArea.toLocaleString()} sqft</span>
                                )}
                                {comp.yearBuilt && (
                                  <span>• Built {comp.yearBuilt}</span>
                                )}
                              </div>
                              {/* Close Date & Distance */}
                              <div className={`flex gap-3 text-xs mt-1 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                {comp.closeDate && (
                                  <span>Closed {new Date(comp.closeDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                )}
                                {comp.distance !== undefined && (
                                  <span>• {comp.distance} mi away</span>
                                )}
                              </div>
                            </div>
                            {/* Price */}
                            <div className="ml-4 text-right">
                              <p className={`text-lg font-bold ${
                                isRental(comp)
                                  ? (isLight ? 'text-blue-600' : 'text-blue-400')
                                  : (isLight ? 'text-green-600' : 'text-green-400')
                              }`}>
                                ${comp.closePrice?.toLocaleString()}
                              </p>
                              {comp.livingArea && comp.closePrice && (
                                <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                  ${Math.round(comp.closePrice / comp.livingArea)}/sqft
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : !loadingComparables ? (
                    <div className="p-8 text-center">
                      <Home className={`w-12 h-12 mx-auto mb-2 opacity-30 ${isLight ? 'text-gray-400' : 'text-gray-600'}`} />
                      <p className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                        No recent market activity found nearby
                      </p>
                      <p className={`text-xs mt-1 ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                        Searching within 0.5 miles
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* TAGS & LABELS */}
            {((contact.tags && contact.tags.length > 0) || (contact.labels && contact.labels.length > 0)) && (
              <div>
                <h3
                  className={`text-lg font-semibold mb-3 flex items-center ${
                    isLight ? 'text-gray-900' : 'text-white'
                  }`}
                >
                  <Tag className="w-5 h-5 mr-2" />
                  Tags & Labels
                </h3>
                <div
                  className={`p-4 rounded-lg ${
                    isLight ? 'bg-gray-50' : 'bg-gray-800'
                  }`}
                >
                  <div className="flex flex-wrap gap-2">
                    {contact.tags?.map((tag, idx) => (
                      <span
                        key={idx}
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-900/30 text-blue-400'
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                    {contact.labels?.map((label, idx) => (
                      <span
                        key={idx}
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          isLight ? 'bg-purple-100 text-purple-700' : 'bg-purple-900/30 text-purple-400'
                        }`}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* METADATA */}
            <div>
              <h3
                className={`text-lg font-semibold mb-3 flex items-center ${
                  isLight ? 'text-gray-900' : 'text-white'
                }`}
              >
                <Calendar className="w-5 h-5 mr-2" />
                Additional Information
              </h3>
              <div
                className={`p-4 rounded-lg grid grid-cols-2 gap-4 text-sm ${
                  isLight ? 'bg-gray-50' : 'bg-gray-800'
                }`}
              >
                <div>
                  <label
                    className={`text-xs font-medium block mb-1 ${
                      isLight ? 'text-gray-500' : 'text-gray-400'
                    }`}
                  >
                    Created
                  </label>
                  <p className={`${isLight ? 'text-gray-900' : 'text-white'}`}>
                    {formatDate(contact.createdAt)}
                  </p>
                </div>
                {contact.importedAt && (
                  <div>
                    <label
                      className={`text-xs font-medium block mb-1 ${
                        isLight ? 'text-gray-500' : 'text-gray-400'
                      }`}
                    >
                      Imported
                    </label>
                    <p className={`${isLight ? 'text-gray-900' : 'text-white'}`}>
                      {formatDate(contact.importedAt)}
                    </p>
                  </div>
                )}
                {contact.lastContactDate && (
                  <div>
                    <label
                      className={`text-xs font-medium block mb-1 ${
                        isLight ? 'text-gray-500' : 'text-gray-400'
                      }`}
                    >
                      Last Contact
                    </label>
                    <p className={`${isLight ? 'text-gray-900' : 'text-white'}`}>
                      {formatDate(contact.lastContactDate)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* NOTES */}
            {contact.notes && (
              <div>
                <h3
                  className={`text-lg font-semibold mb-3 ${
                    isLight ? 'text-gray-900' : 'text-white'
                  }`}
                >
                  Notes
                </h3>
                <div
                  className={`p-4 rounded-lg ${
                    isLight ? 'bg-gray-50' : 'bg-gray-800'
                  }`}
                >
                  <p className={`whitespace-pre-wrap ${isLight ? 'text-gray-900' : 'text-white'}`}>
                    {contact.notes}
                  </p>
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
          <div className="flex gap-3">
            <button
              onClick={onMessage}
              className="flex-1 px-4 py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-5 h-5" />
              Message
            </button>
            <button
              onClick={onEdit}
              className={`px-4 py-3 rounded-lg font-semibold flex items-center justify-center ${
                isLight
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
            >
              <Edit className="w-5 h-5 mr-2" />
              Edit
            </button>
            <button
              onClick={onDelete}
              className="px-4 py-3 rounded-lg font-semibold bg-red-600 text-white hover:bg-red-700 flex items-center justify-center"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

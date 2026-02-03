/**
 * Contact Edit Modal - Edit contact info from messages
 */

'use client';

import { useState, useEffect } from 'react';
import { X, Save, User, Mail, Phone, Tag, MapPin, Plus, Trash2, Home, RefreshCw, Edit3, CheckCircle2 } from 'lucide-react';
import { Conversation } from '@/app/agent/messages/types';
import { handlePhoneInput } from '@/lib/phoneFormat';

interface ContactEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation;
  onSave: (updatedContact: any) => void;
  isLight: boolean;
}

interface EmailField {
  address: string;
  label: 'personal' | 'work' | 'other';
  isPrimary: boolean;
}

interface PhoneField {
  number: string;
  label: 'mobile' | 'home' | 'work' | 'other';
  isPrimary: boolean;
}

export default function ContactEditModal({
  isOpen,
  onClose,
  conversation,
  onSave,
  isLight
}: ContactEditModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [emails, setEmails] = useState<EmailField[]>([{ address: '', label: 'personal', isPrimary: true }]);
  const [phones, setPhones] = useState<PhoneField[]>([{ number: conversation.phoneNumber, label: 'mobile', isPrimary: true }]);
  const [address, setAddress] = useState({
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'USA'
  });
  const [saving, setSaving] = useState(false);

  // Property enrichment state
  const [propertyData, setPropertyData] = useState<{
    bedrooms: number | null;
    bathrooms: number | null;
    sqft: number | null;
    yearBuilt: number | null;
    propertyType: string | null;
    purchasePrice: number | null;
    purchaseDate: string | null;
    latitude: number | null;
    longitude: number | null;
    lotSize: string | null;
    pool: boolean;
  }>({
    bedrooms: null,
    bathrooms: null,
    sqft: null,
    yearBuilt: null,
    propertyType: null,
    purchasePrice: null,
    purchaseDate: null,
    latitude: null,
    longitude: null,
    lotSize: null,
    pool: false,
  });
  const [enriching, setEnriching] = useState(false);
  const [enriched, setEnriched] = useState(false);
  const [enrichmentError, setEnrichmentError] = useState<string | null>(null);
  const [isEditingPropertyData, setIsEditingPropertyData] = useState(false);

  // Tags state
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Initialize form with existing data
  useEffect(() => {
    if (isOpen && conversation.contactInfo) {
      setFirstName(conversation.contactInfo.firstName || '');
      setLastName(conversation.contactInfo.lastName || '');

      // Load emails
      if (conversation.contactInfo.email) {
        setEmails([{ address: conversation.contactInfo.email, label: 'personal', isPrimary: true }]);
      }

      // Load tags
      setTags(conversation.contactInfo.tags || []);
    } else if (isOpen) {
      // New contact - clear form
      setFirstName('');
      setLastName('');
      setEmails([{ address: '', label: 'personal', isPrimary: true }]);
      setPhones([{ number: conversation.phoneNumber, label: 'mobile', isPrimary: true }]);
      setAddress({ street: '', city: '', state: '', zip: '', country: 'USA' });
      setTags([]);
    }
  }, [isOpen, conversation]);

  const addEmail = () => {
    setEmails([...emails, { address: '', label: 'personal', isPrimary: false }]);
  };

  const removeEmail = (index: number) => {
    if (emails.length > 1) {
      setEmails(emails.filter((_, i) => i !== index));
    }
  };

  const updateEmail = (index: number, field: keyof EmailField, value: any) => {
    const updated = [...emails];
    if (field === 'isPrimary' && value) {
      // If setting as primary, unset others
      updated.forEach((e, i) => {
        e.isPrimary = i === index;
      });
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setEmails(updated);
  };

  const addPhone = () => {
    setPhones([...phones, { number: '', label: 'mobile', isPrimary: false }]);
  };

  const removePhone = (index: number) => {
    if (phones.length > 1) {
      setPhones(phones.filter((_, i) => i !== index));
    }
  };

  const updatePhone = (index: number, field: keyof PhoneField, value: any) => {
    const updated = [...phones];
    if (field === 'isPrimary' && value) {
      // If setting as primary, unset others
      updated.forEach((p, i) => {
        p.isPrimary = i === index;
      });
    } else if (field === 'number') {
      // Auto-format phone number to E.164 (+1XXXXXXXXXX)
      updated[index] = { ...updated[index], [field]: handlePhoneInput(value) };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setPhones(updated);
  };

  // Tag handlers
  const addTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleTagKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  // Property enrichment function
  const handleEnrichProperty = async () => {
    if (!address.street || !address.city || !address.state) {
      return; // Need minimum address data
    }

    setEnriching(true);
    setEnrichmentError(null);

    try {
      console.log('[ContactEditModal] Enriching property data for address:', address);

      const response = await fetch('/api/crm/contacts/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.property) {
          setPropertyData({
            bedrooms: data.property.bedrooms,
            bathrooms: data.property.bathrooms,
            sqft: data.property.sqft,
            yearBuilt: data.property.yearBuilt,
            propertyType: data.property.propertyType,
            purchasePrice: data.property.purchasePrice,
            purchaseDate: data.property.purchaseDate,
            latitude: data.geocode.lat,
            longitude: data.geocode.lng,
            lotSize: data.property.lotSize,
            pool: data.property.pool || false,
          });
          setEnriched(true);
          console.log('[ContactEditModal] Property data enriched successfully');
        } else {
          // Geocode succeeded but no property data found
          setPropertyData(prev => ({
            ...prev,
            latitude: data.geocode.lat,
            longitude: data.geocode.lng,
          }));
          setEnrichmentError('Property coordinates found, but no MLS data available. You can manually enter property details.');
          console.log('[ContactEditModal] Geocoded but no property data found');
        }
      } else {
        setEnrichmentError(data.error || 'Failed to enrich property data');
        console.error('[ContactEditModal] Enrichment failed:', data.error);
      }
    } catch (error) {
      console.error('[ContactEditModal] Error enriching property:', error);
      setEnrichmentError('Error connecting to property enrichment service');
    } finally {
      setEnriching(false);
    }
  };

  // Debounced auto-enrichment when address changes
  useEffect(() => {
    // Don't auto-enrich if already enriched or if editing property data
    if (enriched || isEditingPropertyData) return;

    const timer = setTimeout(() => {
      if (address.street && address.city && address.state) {
        handleEnrichProperty();
      }
    }, 1500); // 1.5 second debounce

    return () => clearTimeout(timer);
  }, [address.street, address.city, address.state, address.zip]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const contactData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        emails: emails.filter(e => e.address.trim()).map(e => ({
          address: e.address.trim(),
          label: e.label,
          isPrimary: e.isPrimary,
          isValid: true
        })),
        phones: phones.filter(p => p.number.trim()).map(p => ({
          number: p.number.trim(),
          label: p.label,
          isPrimary: p.isPrimary,
          isValid: true
        })),
        address: address.street || address.city ? address : undefined,
        tags: tags.length > 0 ? tags : undefined,
        // Legacy fields for backward compatibility
        email: emails.find(e => e.isPrimary)?.address || emails[0]?.address || undefined,
        phone: phones.find(p => p.isPrimary)?.number || phones[0]?.number || undefined,
        // Property data from enrichment
        latitude: propertyData.latitude,
        longitude: propertyData.longitude,
        bedrooms: propertyData.bedrooms,
        bathrooms: propertyData.bathrooms,
        sqft: propertyData.sqft,
        yearBuilt: propertyData.yearBuilt,
        propertyType: propertyData.propertyType,
        purchasePrice: propertyData.purchasePrice,
        purchaseDate: propertyData.purchaseDate,
        lotSize: propertyData.lotSize,
      };

      let response;
      if (conversation.contactId) {
        // Update existing contact
        response = await fetch(`/api/crm/contacts/${conversation.contactId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contactData),
        });
      } else {
        // Create new contact
        response = await fetch('/api/crm/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contactData),
        });
      }

      const data = await response.json();
      if (data.success) {
        onSave(data.contact);
        onClose();
      } else {
        alert('Failed to save contact: ' + data.error);
      }
    } catch (error) {
      console.error('[ContactEditModal] Error saving contact:', error);
      alert('Error saving contact');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-24 md:pb-4 pointer-events-none overflow-y-auto">
        <div
          className={`w-full max-w-2xl rounded-xl shadow-2xl pointer-events-auto my-8 max-h-[calc(100vh-8rem)] md:max-h-[90vh] flex flex-col ${
            isLight ? 'bg-white' : 'bg-gray-900'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`flex items-center justify-between p-4 border-b ${
            isLight ? 'border-gray-200' : 'border-gray-700'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isLight ? 'bg-blue-100' : 'bg-blue-900/30'
              }`}>
                <User className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
              </div>
              <div>
                <h2 className={`text-lg font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  {conversation.contactId ? 'Edit Contact' : 'Create Contact'}
                </h2>
                <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                  {conversation.phoneNumber}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                isLight
                  ? 'hover:bg-gray-100 text-gray-600'
                  : 'hover:bg-gray-800 text-gray-400'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form - Scrollable */}
          <div className="p-4 space-y-4 flex-1 overflow-y-auto min-h-0">
            {/* Name Section */}
            <div className="grid grid-cols-2 gap-3">
              {/* First Name */}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${
                  isLight ? 'text-gray-700' : 'text-gray-300'
                }`}>
                  First Name *
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  className={`w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                    isLight
                      ? 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
                      : 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500'
                  }`}
                />
              </div>

              {/* Last Name */}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${
                  isLight ? 'text-gray-700' : 'text-gray-300'
                }`}>
                  Last Name *
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Smith"
                  className={`w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                    isLight
                      ? 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
                      : 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500'
                  }`}
                />
              </div>
            </div>

            {/* Emails Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={`text-sm font-medium ${
                  isLight ? 'text-gray-700' : 'text-gray-300'
                }`}>
                  Email Addresses
                </label>
                <button
                  onClick={addEmail}
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                    isLight
                      ? 'text-blue-600 hover:bg-blue-50'
                      : 'text-blue-400 hover:bg-blue-900/20'
                  }`}
                >
                  <Plus className="w-3 h-3" />
                  Add Email
                </button>
              </div>
              <div className="space-y-2">
                {emails.map((email, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="flex-1">
                      <div className="relative">
                        <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                          isLight ? 'text-gray-400' : 'text-gray-500'
                        }`} />
                        <input
                          type="email"
                          value={email.address}
                          onChange={(e) => updateEmail(index, 'address', e.target.value)}
                          placeholder="email@example.com"
                          className={`w-full pl-10 pr-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                            isLight
                              ? 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
                              : 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500'
                          }`}
                        />
                      </div>
                    </div>
                    <select
                      value={email.label}
                      onChange={(e) => updateEmail(index, 'label', e.target.value)}
                      className={`px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                        isLight
                          ? 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
                          : 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500'
                      }`}
                    >
                      <option value="personal">Personal</option>
                      <option value="work">Work</option>
                      <option value="other">Other</option>
                    </select>
                    <label className="flex items-center gap-1 px-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={email.isPrimary}
                        onChange={(e) => updateEmail(index, 'isPrimary', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                        Primary
                      </span>
                    </label>
                    {emails.length > 1 && (
                      <button
                        onClick={() => removeEmail(index)}
                        className={`p-2 rounded-lg transition-colors ${
                          isLight
                            ? 'hover:bg-red-50 text-red-600'
                            : 'hover:bg-red-900/20 text-red-400'
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Phones Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={`text-sm font-medium ${
                  isLight ? 'text-gray-700' : 'text-gray-300'
                }`}>
                  Phone Numbers
                </label>
                <button
                  onClick={addPhone}
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                    isLight
                      ? 'text-blue-600 hover:bg-blue-50'
                      : 'text-blue-400 hover:bg-blue-900/20'
                  }`}
                >
                  <Plus className="w-3 h-3" />
                  Add Phone
                </button>
              </div>
              <div className="space-y-2">
                {phones.map((phone, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="flex-1">
                      <div className="relative">
                        <Phone className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                          isLight ? 'text-gray-400' : 'text-gray-500'
                        }`} />
                        <input
                          type="tel"
                          value={phone.number}
                          onChange={(e) => updatePhone(index, 'number', e.target.value)}
                          placeholder="+17603977807"
                          className={`w-full pl-10 pr-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                            isLight
                              ? 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
                              : 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500'
                          }`}
                        />
                      </div>
                    </div>
                    <select
                      value={phone.label}
                      onChange={(e) => updatePhone(index, 'label', e.target.value)}
                      className={`px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                        isLight
                          ? 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
                          : 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500'
                      }`}
                    >
                      <option value="mobile">Mobile</option>
                      <option value="home">Home</option>
                      <option value="work">Work</option>
                      <option value="other">Other</option>
                    </select>
                    <label className="flex items-center gap-1 px-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={phone.isPrimary}
                        onChange={(e) => updatePhone(index, 'isPrimary', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                        Primary
                      </span>
                    </label>
                    {phones.length > 1 && (
                      <button
                        onClick={() => removePhone(index)}
                        className={`p-2 rounded-lg transition-colors ${
                          isLight
                            ? 'hover:bg-red-50 text-red-600'
                            : 'hover:bg-red-900/20 text-red-400'
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Address Section */}
            <div>
              <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${
                isLight ? 'text-gray-700' : 'text-gray-300'
              }`}>
                <MapPin className="w-4 h-4" />
                Address
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  value={address.street}
                  onChange={(e) => setAddress({ ...address, street: e.target.value })}
                  placeholder="Street Address"
                  className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                    isLight
                      ? 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
                      : 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500'
                  }`}
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    placeholder="City"
                    className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                      isLight
                        ? 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
                        : 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500'
                    }`}
                  />
                  <input
                    type="text"
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    placeholder="State"
                    className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                      isLight
                        ? 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
                        : 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500'
                    }`}
                  />
                  <input
                    type="text"
                    value={address.zip}
                    onChange={(e) => setAddress({ ...address, zip: e.target.value })}
                    placeholder="ZIP"
                    className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                      isLight
                        ? 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
                        : 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Tags Section */}
            <div>
              <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${
                isLight ? 'text-gray-700' : 'text-gray-300'
              }`}>
                <Tag className="w-4 h-4" />
                Tags
              </label>
              <div className="space-y-2">
                {/* Tag Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={handleTagKeyPress}
                    placeholder="e.g., buyer, seller, investor"
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                      isLight
                        ? 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
                        : 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500'
                    }`}
                  />
                  <button
                    onClick={addTag}
                    disabled={!tagInput.trim()}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      tagInput.trim()
                        ? isLight
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Add
                  </button>
                </div>

                {/* Tags Display */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
                      <span
                        key={index}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm ${
                          isLight
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-blue-900/30 text-blue-400'
                        }`}
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className={`hover:opacity-70 transition-opacity ${
                            isLight ? 'text-blue-600' : 'text-blue-300'
                          }`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Property Details Section */}
            {(enriching || enriched || enrichmentError || propertyData.latitude) && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={`flex items-center gap-2 text-sm font-medium ${
                    isLight ? 'text-gray-700' : 'text-gray-300'
                  }`}>
                    <Home className="w-4 h-4" />
                    Property Details
                    {enriching && (
                      <RefreshCw className={`w-3 h-3 animate-spin ${
                        isLight ? 'text-blue-600' : 'text-blue-400'
                      }`} />
                    )}
                    {enriched && !enrichmentError && (
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                    )}
                  </label>
                  <div className="flex gap-2">
                    {!enriching && (
                      <button
                        onClick={handleEnrichProperty}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                          isLight
                            ? 'text-blue-600 hover:bg-blue-50'
                            : 'text-blue-400 hover:bg-blue-900/20'
                        }`}
                        title="Refresh property data from MLS"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Refresh
                      </button>
                    )}
                    {enriched && !isEditingPropertyData && (
                      <button
                        onClick={() => setIsEditingPropertyData(true)}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                          isLight
                            ? 'text-blue-600 hover:bg-blue-50'
                            : 'text-blue-400 hover:bg-blue-900/20'
                        }`}
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit
                      </button>
                    )}
                  </div>
                </div>

                {enrichmentError && (
                  <div className={`text-xs p-2 rounded mb-2 ${
                    isLight
                      ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                      : 'bg-yellow-900/20 text-yellow-400 border border-yellow-800'
                  }`}>
                    {enrichmentError}
                  </div>
                )}

                {enriching ? (
                  <div className={`p-4 rounded-lg text-center ${
                    isLight ? 'bg-gray-50' : 'bg-gray-800'
                  }`}>
                    <div className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                      Fetching property data from MLS...
                    </div>
                  </div>
                ) : isEditingPropertyData ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${
                        isLight ? 'text-gray-600' : 'text-gray-400'
                      }`}>
                        Bedrooms
                      </label>
                      <input
                        type="number"
                        value={propertyData.bedrooms || ''}
                        onChange={(e) => setPropertyData({...propertyData, bedrooms: e.target.value ? parseInt(e.target.value) : null})}
                        placeholder="3"
                        className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                          isLight
                            ? 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
                            : 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${
                        isLight ? 'text-gray-600' : 'text-gray-400'
                      }`}>
                        Bathrooms
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={propertyData.bathrooms || ''}
                        onChange={(e) => setPropertyData({...propertyData, bathrooms: e.target.value ? parseFloat(e.target.value) : null})}
                        placeholder="2.5"
                        className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                          isLight
                            ? 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
                            : 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${
                        isLight ? 'text-gray-600' : 'text-gray-400'
                      }`}>
                        Square Feet
                      </label>
                      <input
                        type="number"
                        value={propertyData.sqft || ''}
                        onChange={(e) => setPropertyData({...propertyData, sqft: e.target.value ? parseInt(e.target.value) : null})}
                        placeholder="2000"
                        className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                          isLight
                            ? 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
                            : 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${
                        isLight ? 'text-gray-600' : 'text-gray-400'
                      }`}>
                        Year Built
                      </label>
                      <input
                        type="number"
                        value={propertyData.yearBuilt || ''}
                        onChange={(e) => setPropertyData({...propertyData, yearBuilt: e.target.value ? parseInt(e.target.value) : null})}
                        placeholder="1999"
                        className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                          isLight
                            ? 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
                            : 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${
                        isLight ? 'text-gray-600' : 'text-gray-400'
                      }`}>
                        Purchase Price
                      </label>
                      <input
                        type="number"
                        value={propertyData.purchasePrice || ''}
                        onChange={(e) => setPropertyData({...propertyData, purchasePrice: e.target.value ? parseInt(e.target.value) : null})}
                        placeholder="550000"
                        className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                          isLight
                            ? 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
                            : 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${
                        isLight ? 'text-gray-600' : 'text-gray-400'
                      }`}>
                        Purchase Date
                      </label>
                      <input
                        type="date"
                        value={propertyData.purchaseDate || ''}
                        onChange={(e) => setPropertyData({...propertyData, purchaseDate: e.target.value})}
                        className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                          isLight
                            ? 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
                            : 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500'
                        }`}
                      />
                    </div>
                    <div className="col-span-2 flex justify-end gap-2 mt-2">
                      <button
                        onClick={() => setIsEditingPropertyData(false)}
                        className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                          isLight
                            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : propertyData.bedrooms !== null || propertyData.latitude !== null ? (
                  <div className={`p-3 rounded-lg ${isLight ? 'bg-gray-50' : 'bg-gray-800'}`}>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {propertyData.bedrooms !== null && (
                        <div>
                          <span className={`text-xs font-medium ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                            Bedrooms:
                          </span>
                          <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                            {propertyData.bedrooms}
                          </div>
                        </div>
                      )}
                      {propertyData.bathrooms !== null && (
                        <div>
                          <span className={`text-xs font-medium ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                            Bathrooms:
                          </span>
                          <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                            {propertyData.bathrooms}
                          </div>
                        </div>
                      )}
                      {propertyData.sqft !== null && (
                        <div>
                          <span className={`text-xs font-medium ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                            Square Feet:
                          </span>
                          <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                            {propertyData.sqft?.toLocaleString()}
                          </div>
                        </div>
                      )}
                      {propertyData.yearBuilt !== null && (
                        <div>
                          <span className={`text-xs font-medium ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                            Year Built:
                          </span>
                          <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                            {propertyData.yearBuilt}
                          </div>
                        </div>
                      )}
                      {propertyData.purchasePrice !== null && (
                        <div>
                          <span className={`text-xs font-medium ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                            Purchase Price:
                          </span>
                          <div className={`font-medium text-green-600`}>
                            ${propertyData.purchasePrice?.toLocaleString()}
                          </div>
                        </div>
                      )}
                      {propertyData.purchaseDate && (
                        <div>
                          <span className={`text-xs font-medium ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                            Purchase Date:
                          </span>
                          <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                            {new Date(propertyData.purchaseDate).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                    </div>
                    {enriched && (
                      <div className={`text-xs mt-2 pt-2 border-t ${
                        isLight ? 'text-gray-500 border-gray-200' : 'text-gray-400 border-gray-700'
                      }`}>
                        Data auto-populated from MLS database
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`flex gap-3 p-4 border-t flex-shrink-0 ${
            isLight ? 'border-gray-200' : 'border-gray-700'
          }`}>
            <button
              onClick={onClose}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                isLight
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!firstName.trim() || !lastName.trim() || saving}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-white transition-colors flex items-center justify-center gap-2 ${
                !firstName.trim() || !lastName.trim() || saving
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Contact'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

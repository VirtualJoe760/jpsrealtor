/**
 * Contact Card Component
 *
 * Swipeable contact card for Prospect Discovery.
 * Displays contact information and allows swipe gestures for organization.
 *
 * Swipe Interactions:
 * - Swipe Right: Add to label/campaign
 * - Swipe Left: Skip/Reject
 * - Tap: View details
 */

'use client';

import React from 'react';
import {
  PhoneIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

interface ContactCardProps {
  contact: {
    _id: string;
    firstName: string;
    lastName: string;
    organization?: string;
    phones?: Array<{
      number: string;
      label: string;
      isPrimary: boolean;
    }>;
    phone?: string; // Legacy fallback
    emails?: Array<{
      address: string;
      label: string;
      isPrimary: boolean;
    }>;
    email?: string; // Legacy fallback
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
  };
  style?: React.CSSProperties;
  className?: string;
  onSwipe?: (direction: 'left' | 'right') => void;
  isDragging?: boolean;
}

export default function ContactCard({
  contact,
  style,
  className = '',
  onSwipe,
  isDragging = false,
}: ContactCardProps) {
  const {
    firstName,
    lastName,
    organization,
    phones,
    phone,
    emails,
    email,
    address,
    dataQuality,
    isPersonal,
    photo,
  } = contact;

  const fullName = `${firstName} ${lastName}`.trim() || organization || 'Unknown';
  const primaryPhone = phones?.find(p => p.isPrimary)?.number || phones?.[0]?.number || phone;
  const primaryEmail = emails?.find(e => e.isPrimary)?.address || emails?.[0]?.address || email;

  // Quality badge
  const getQualityBadge = () => {
    if (!dataQuality?.score) return null;

    const score = dataQuality.score;
    let color = 'bg-green-100 text-green-700';
    let label = 'Excellent';

    if (score < 80) {
      color = 'bg-blue-100 text-blue-700';
      label = 'Good';
    }
    if (score < 60) {
      color = 'bg-yellow-100 text-yellow-700';
      label = 'Fair';
    }
    if (score < 40) {
      color = 'bg-red-100 text-red-700';
      label = 'Poor';
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${color}`}>
        {score} • {label}
      </span>
    );
  };

  // Format address
  const formatAddress = () => {
    if (!address) return null;
    const parts = [
      address.street,
      address.city,
      address.state,
      address.zip,
    ].filter(Boolean);
    return parts.join(', ');
  };

  const addressString = formatAddress();

  return (
    <div
      style={style}
      className={`
        bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden
        ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
        ${className}
      `}
    >
      {/* Header with Photo/Avatar */}
      <div className="relative h-48 bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center">
        {photo ? (
          <img
            src={photo}
            alt={fullName}
            className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
          />
        ) : (
          <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-white flex items-center justify-center">
            <UserCircleIcon className="w-24 h-24 text-gray-400" />
          </div>
        )}

        {/* Quality Badge (top-right) */}
        {dataQuality && (
          <div className="absolute top-4 right-4">
            {getQualityBadge()}
          </div>
        )}

        {/* Personal Flag (top-left) */}
        {isPersonal && (
          <div className="absolute top-4 left-4">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
              Personal
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Name & Organization */}
        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-900">{fullName}</h3>
          {organization && firstName && (
            <p className="text-sm text-gray-600 mt-1 flex items-center justify-center">
              <BuildingOfficeIcon className="h-4 w-4 mr-1" />
              {organization}
            </p>
          )}
        </div>

        {/* Contact Info */}
        <div className="space-y-3">
          {/* Phone */}
          {primaryPhone && (
            <div className="flex items-center text-gray-700">
              <PhoneIcon className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-medium">{primaryPhone}</div>
                {phones && phones.length > 1 && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    +{phones.length - 1} more phone{phones.length > 2 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Email */}
          {primaryEmail && (
            <div className="flex items-center text-gray-700">
              <EnvelopeIcon className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-medium break-all">{primaryEmail}</div>
                {emails && emails.length > 1 && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    +{emails.length - 1} more email{emails.length > 2 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Address */}
          {addressString && (
            <div className="flex items-start text-gray-700">
              <MapPinIcon className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm">{addressString}</div>
              </div>
            </div>
          )}
        </div>

        {/* Data Quality Issues */}
        {dataQuality?.issues && dataQuality.issues.length > 0 && (
          <div className="pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 mb-2">Data Quality Issues:</div>
            <div className="flex flex-wrap gap-2">
              {dataQuality.issues.slice(0, 3).map((issue, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                >
                  {issue.replace(/_/g, ' ')}
                </span>
              ))}
              {dataQuality.issues.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                  +{dataQuality.issues.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Swipe Instructions (shown when not dragging) */}
      {!isDragging && (
        <div className="px-6 pb-6 flex items-center justify-center space-x-6 text-sm text-gray-500">
          <div className="flex items-center">
            <span className="mr-2">←</span>
            <span>Swipe left to skip</span>
          </div>
          <div className="flex items-center">
            <span>Swipe right to add</span>
            <span className="ml-2">→</span>
          </div>
        </div>
      )}
    </div>
  );
}

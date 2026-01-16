// ContactProperties - Display property comparables
import React from 'react';
import { ContactComparable } from '../../types/index';

interface ContactPropertiesProps {
  comparables: ContactComparable[];
  loading: boolean;
  onRefresh: () => void;
}

export function ContactProperties({
  comparables,
  loading,
  onRefresh,
}: ContactPropertiesProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (comparables.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          No property comparables found
        </p>
        <button
          onClick={onRefresh}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          type="button"
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Property Comparables ({comparables.length})
        </h3>
        <button
          onClick={onRefresh}
          className="text-sm text-blue-600 hover:text-blue-700"
          type="button"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-4">
        {comparables.map((comp) => (
          <div
            key={comp._id}
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow"
          >
            {/* Photo */}
            {comp.photos && comp.photos.length > 0 && (
              <img
                src={comp.photos[0]}
                alt={comp.address}
                className="w-full h-40 object-cover rounded-lg mb-3"
              />
            )}

            {/* Address */}
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              {comp.address}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {comp.city}, {comp.state} {comp.zip}
            </p>

            {/* Price and Details */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-lg font-bold text-blue-600">
                ${comp.price.toLocaleString()}
              </span>
              {comp.status && (
                <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  {comp.status}
                </span>
              )}
            </div>

            {/* Specs */}
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
              {comp.bedrooms && (
                <div>
                  <span className="font-medium">{comp.bedrooms}</span> beds
                </div>
              )}
              {comp.bathrooms && (
                <div>
                  <span className="font-medium">{comp.bathrooms}</span> baths
                </div>
              )}
              {comp.sqft && (
                <div>
                  <span className="font-medium">{comp.sqft.toLocaleString()}</span> sqft
                </div>
              )}
              {comp.yearBuilt && (
                <div>
                  Built <span className="font-medium">{comp.yearBuilt}</span>
                </div>
              )}
            </div>

            {/* Dates */}
            {(comp.listDate || comp.soldDate) && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                {comp.listDate && <div>Listed: {new Date(comp.listDate).toLocaleDateString()}</div>}
                {comp.soldDate && <div>Sold: {new Date(comp.soldDate).toLocaleDateString()}</div>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

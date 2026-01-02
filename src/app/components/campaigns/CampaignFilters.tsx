// app/components/campaigns/CampaignFilters.tsx
'use client';

import { useThemeClasses, useTheme } from '@/app/contexts/ThemeContext';

export default function CampaignFilters() {
  const { cardBg, cardBorder, textPrimary, textSecondary, bgSecondary, border } = useThemeClasses();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  return (
    <div className={`${cardBg} rounded-lg ${cardBorder} p-4`}>
      <h3 className={`text-sm font-semibold ${textPrimary} mb-4`}>
        Advanced Filters
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={`block text-sm font-medium ${textSecondary} mb-2`}>
            Campaign Type
          </label>
          <select className={`w-full px-3 py-2 ${bgSecondary} ${border} rounded-lg focus:ring-2 ${isLight ? 'focus:ring-blue-500' : 'focus:ring-emerald-500'} focus:border-transparent ${textPrimary}`}>
            <option value="">All Types</option>
            <option value="sphere_of_influence">Sphere of Influence</option>
            <option value="past_clients">Past Clients</option>
            <option value="neighborhood_expireds">Expired Listings</option>
            <option value="high_equity">High Equity</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div>
          <label className={`block text-sm font-medium ${textSecondary} mb-2`}>
            Date Range
          </label>
          <select className={`w-full px-3 py-2 ${bgSecondary} ${border} rounded-lg focus:ring-2 ${isLight ? 'focus:ring-blue-500' : 'focus:ring-emerald-500'} focus:border-transparent ${textPrimary}`}>
            <option value="">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
          </select>
        </div>
        <div>
          <label className={`block text-sm font-medium ${textSecondary} mb-2`}>
            Strategies
          </label>
          <select className={`w-full px-3 py-2 ${bgSecondary} ${border} rounded-lg focus:ring-2 ${isLight ? 'focus:ring-blue-500' : 'focus:ring-emerald-500'} focus:border-transparent ${textPrimary}`}>
            <option value="">All Strategies</option>
            <option value="voicemail">Voicemail</option>
            <option value="email">Email</option>
            <option value="text">Text/SMS</option>
          </select>
        </div>
      </div>
    </div>
  );
}

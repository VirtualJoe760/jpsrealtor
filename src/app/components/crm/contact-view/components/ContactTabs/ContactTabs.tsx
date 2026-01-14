// ContactTabs - Tab navigation for contact view
import React from 'react';
import { ContactViewTab } from '../../types/index';

interface ContactTabsProps {
  activeTab: ContactViewTab;
  onTabChange: (tab: ContactViewTab) => void;
}

const TABS = [
  { value: ContactViewTab.OVERVIEW, label: 'Overview' },
  { value: ContactViewTab.PROPERTIES, label: 'Properties' },
  { value: ContactViewTab.NOTES, label: 'Notes' },
  { value: ContactViewTab.ACTIVITY, label: 'Activity' },
];

export function ContactTabs({ activeTab, onTabChange }: ContactTabsProps) {
  return (
    <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.value;
        return (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={`
              px-4 py-3 font-medium text-sm transition-colors relative
              ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }
            `}
            type="button"
          >
            {tab.label}
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></div>
            )}
          </button>
        );
      })}
    </div>
  );
}

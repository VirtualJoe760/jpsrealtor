// EmailFolderNav component - Folder navigation sidebar

import React from 'react';
import { Inbox, Send, LucideIcon } from 'lucide-react';
import type { FolderType, SentSubfolder } from '../../types';
import { EMAIL_FOLDERS, EMAIL_SENT_SUBFOLDERS } from '../../constants';

export interface EmailFolderNavProps {
  activeFolder: FolderType;
  sentSubfolder?: SentSubfolder;
  onFolderChange: (folder: FolderType) => void;
  onSentSubfolderChange: (subfolder: SentSubfolder) => void;
  isLight: boolean;
}

export function EmailFolderNav({
  activeFolder,
  sentSubfolder,
  onFolderChange,
  onSentSubfolderChange,
  isLight,
}: EmailFolderNavProps) {
  const bgClass = isLight ? 'bg-white' : 'bg-gray-900';
  const textClass = isLight ? 'text-gray-900' : 'text-white';
  const mutedClass = isLight ? 'text-gray-600' : 'text-gray-400';
  const activeBgClass = isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-900 text-blue-300';
  const hoverClass = isLight ? 'hover:bg-gray-100' : 'hover:bg-gray-800';
  const borderClass = isLight ? 'border-gray-200' : 'border-gray-700';

  return (
    <div className={`${bgClass} border-r ${borderClass} w-64 flex-shrink-0 overflow-y-auto`}>
      <div className="p-4">
        <h3 className={`${textClass} font-semibold mb-3 text-sm uppercase tracking-wide`}>
          Folders
        </h3>

        <div className="space-y-1">
          {EMAIL_FOLDERS.map((folder) => {
            const Icon = folder.icon;
            const isActive = activeFolder === folder.id;

            return (
              <div key={folder.id}>
                <button
                  onClick={() => onFolderChange(folder.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-colors ${
                    isActive && !sentSubfolder
                      ? activeBgClass
                      : `${textClass} ${hoverClass}`
                  }`}
                >
                  <Icon size={18} />
                  <span className="font-medium">{folder.label}</span>
                </button>

                {/* Sent Subfolders */}
                {folder.id === 'sent' && activeFolder === 'sent' && (
                  <div className="ml-6 mt-1 space-y-1">
                    {EMAIL_SENT_SUBFOLDERS.map((sub) => {
                      const isSubActive = sentSubfolder === sub.id;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => onSentSubfolderChange(sub.id)}
                          className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                            isSubActive
                              ? activeBgClass
                              : `${mutedClass} ${hoverClass}`
                          }`}
                        >
                          {sub.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

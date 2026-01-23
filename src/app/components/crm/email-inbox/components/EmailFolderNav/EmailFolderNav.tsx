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
  const bgClass = isLight ? 'bg-white/30 backdrop-blur-sm' : 'bg-neutral-900/30 backdrop-blur-sm';
  const textClass = isLight ? 'text-slate-900' : 'text-white';
  const mutedClass = isLight ? 'text-slate-600' : 'text-gray-400';
  const activeBgClass = isLight ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white';
  const hoverClass = isLight ? 'hover:bg-slate-100' : 'hover:bg-gray-800';
  const borderClass = isLight ? 'border-slate-200' : 'border-gray-700';

  return (
    <div className={`${bgClass} border-r ${borderClass} w-56 flex-shrink-0 overflow-y-auto`}>
      <div className="p-3">
        <h3 className={`${textClass} font-semibold mb-2 text-xs uppercase tracking-wide px-2`}>
          Folders
        </h3>

        <div className="space-y-0.5">
          {EMAIL_FOLDERS.map((folder) => {
            const Icon = folder.icon;
            const isActive = activeFolder === folder.id;

            return (
              <div key={folder.id}>
                <button
                  onClick={() => onFolderChange(folder.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                    isActive && !sentSubfolder
                      ? activeBgClass
                      : `${textClass} ${hoverClass}`
                  }`}
                >
                  <Icon size={16} />
                  <span className="font-medium">{folder.label}</span>
                </button>

                {/* Sent Subfolders */}
                {folder.id === 'sent' && activeFolder === 'sent' && (
                  <div className="ml-5 mt-0.5 space-y-0.5">
                    {EMAIL_SENT_SUBFOLDERS.map((sub) => {
                      const isSubActive = sentSubfolder === sub.id;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => onSentSubfolderChange(sub.id)}
                          className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${
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

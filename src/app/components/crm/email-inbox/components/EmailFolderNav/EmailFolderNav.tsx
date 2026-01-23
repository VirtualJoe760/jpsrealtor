// EmailFolderNav component - Folder navigation sidebar

import React from 'react';
import { Inbox, Send, LucideIcon, ChevronDown, ChevronRight } from 'lucide-react';
import type { FolderType, SentSubfolder } from '../../types';
import {
  EMAIL_FOLDERS,
  EMAIL_SENT_SUBFOLDERS,
  EMAIL_FARMS_SUBFOLDERS,
  EMAIL_CLIENTS_SUBFOLDERS,
  EMAIL_ESCROWS_SUBFOLDERS
} from '../../constants';

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
  const [expandedFolders, setExpandedFolders] = React.useState<Set<string>>(new Set(['sent']));
  const [activeSubfolder, setActiveSubfolder] = React.useState<Record<string, string>>({
    farms: 'all',
    clients: 'all',
    escrows: 'all',
  });

  const bgClass = isLight ? 'bg-white/30 backdrop-blur-sm' : 'bg-neutral-900/30 backdrop-blur-sm';
  const textClass = isLight ? 'text-slate-900' : 'text-white';
  const mutedClass = isLight ? 'text-slate-600' : 'text-gray-400';
  const activeBgClass = isLight ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white';
  const hoverClass = isLight ? 'hover:bg-slate-100' : 'hover:bg-gray-800';
  const borderClass = isLight ? 'border-slate-200' : 'border-gray-700';

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleSubfolderChange = (folder: string, subfolderId: string) => {
    setActiveSubfolder(prev => ({ ...prev, [folder]: subfolderId }));
  };

  const getSubfolders = (folderId: string) => {
    switch (folderId) {
      case 'sent':
        return EMAIL_SENT_SUBFOLDERS;
      case 'farms':
        return EMAIL_FARMS_SUBFOLDERS;
      case 'clients':
        return EMAIL_CLIENTS_SUBFOLDERS;
      case 'escrows':
        return EMAIL_ESCROWS_SUBFOLDERS;
      default:
        return [];
    }
  };

  const hasSubfolders = (folderId: string) => {
    return ['sent', 'farms', 'clients', 'escrows'].includes(folderId);
  };

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
            const isExpanded = expandedFolders.has(folder.id);
            const subfolders = getSubfolders(folder.id);
            const showSubfolders = hasSubfolders(folder.id);

            return (
              <div key={folder.id}>
                <button
                  onClick={() => {
                    onFolderChange(folder.id);
                    if (showSubfolders && !isExpanded) {
                      toggleFolder(folder.id);
                    }
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                    isActive && (!showSubfolders || (folder.id === 'sent' && !sentSubfolder))
                      ? activeBgClass
                      : `${textClass} ${hoverClass}`
                  }`}
                >
                  {showSubfolders && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFolder(folder.id);
                      }}
                      className="flex-shrink-0"
                    >
                      {isExpanded ? (
                        <ChevronDown size={14} className={textClass} />
                      ) : (
                        <ChevronRight size={14} className={textClass} />
                      )}
                    </button>
                  )}
                  <Icon size={16} />
                  <span className="font-medium">{folder.label}</span>
                </button>

                {/* Subfolders */}
                {showSubfolders && isExpanded && (
                  <div className="ml-5 mt-0.5 space-y-0.5">
                    {subfolders.map((sub) => {
                      let isSubActive = false;

                      if (folder.id === 'sent') {
                        isSubActive = sentSubfolder === sub.id;
                      } else {
                        isSubActive = activeSubfolder[folder.id] === sub.id && activeFolder === folder.id;
                      }

                      return (
                        <button
                          key={sub.id}
                          onClick={() => {
                            if (folder.id === 'sent') {
                              onSentSubfolderChange(sub.id);
                            } else {
                              handleSubfolderChange(folder.id, sub.id);
                              onFolderChange(folder.id);
                            }
                          }}
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

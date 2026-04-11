// EmailFolderNav component - Compact folder navigation with compose/refresh

import React from 'react';
import { Inbox, Send, ChevronDown, FolderOpen, Plus, RefreshCw } from 'lucide-react';
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
  onCompose: () => void;
  onRefresh: () => void;
  loading?: boolean;
  isLight: boolean;
}

const PRIMARY_FOLDER_IDS = ['inbox', 'sent'];
const SECONDARY_FOLDER_IDS = ['farms', 'clients', 'escrows'];

export function EmailFolderNav({
  activeFolder,
  sentSubfolder,
  onFolderChange,
  onSentSubfolderChange,
  onCompose,
  onRefresh,
  loading = false,
  isLight,
}: EmailFolderNavProps) {
  const [showSentSubs, setShowSentSubs] = React.useState(false);
  const [foldersOpen, setFoldersOpen] = React.useState(false);
  const [activeSubfolder, setActiveSubfolder] = React.useState<Record<string, string>>({
    farms: 'all',
    clients: 'all',
    escrows: 'all',
  });
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const textClass = isLight ? 'text-slate-900' : 'text-white';
  const mutedClass = isLight ? 'text-slate-600' : 'text-gray-400';
  const activeBgClass = isLight ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white';
  const hoverClass = isLight ? 'hover:bg-slate-100' : 'hover:bg-gray-800';
  const borderClass = isLight ? 'border-slate-200' : 'border-gray-700';
  const dropdownBg = isLight ? 'bg-white' : 'bg-gray-900';
  const primaryBtnClass = isLight
    ? 'bg-blue-600 text-white hover:bg-blue-700'
    : 'bg-emerald-600 text-white hover:bg-emerald-700';

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setFoldersOpen(false);
      }
    };
    if (foldersOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [foldersOpen]);

  const primaryFolders = EMAIL_FOLDERS.filter(f => PRIMARY_FOLDER_IDS.includes(f.id));
  const secondaryFolders = EMAIL_FOLDERS.filter(f => SECONDARY_FOLDER_IDS.includes(f.id));
  const isSecondaryActive = SECONDARY_FOLDER_IDS.includes(activeFolder);

  const getSubfolders = (folderId: string) => {
    switch (folderId) {
      case 'farms': return EMAIL_FARMS_SUBFOLDERS;
      case 'clients': return EMAIL_CLIENTS_SUBFOLDERS;
      case 'escrows': return EMAIL_ESCROWS_SUBFOLDERS;
      default: return [];
    }
  };

  const handleSubfolderChange = (folder: string, subfolderId: string) => {
    setActiveSubfolder(prev => ({ ...prev, [folder]: subfolderId }));
  };

  const activeFolderLabel = isSecondaryActive
    ? EMAIL_FOLDERS.find(f => f.id === activeFolder)?.label
    : null;

  return (
    <div className={`border-b ${borderClass} w-full flex-shrink-0 ${
      isLight ? 'bg-white' : 'bg-gray-900'
    }`}>
      <div className="px-3 py-2">
        <div className="flex items-center gap-2">
          {/* Primary folders: Inbox, Sent */}
          {primaryFolders.map((folder) => {
            const Icon = folder.icon;
            const isActive = activeFolder === folder.id;
            const isSent = folder.id === 'sent';

            return (
              <React.Fragment key={folder.id}>
                <button
                  onClick={() => {
                    onFolderChange(folder.id);
                    if (isSent) setShowSentSubs(!showSentSubs || !isActive);
                    if (!isSent) setShowSentSubs(false);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors whitespace-nowrap ${
                    isActive && !(isSent && sentSubfolder)
                      ? activeBgClass
                      : `${textClass} ${hoverClass}`
                  }`}
                >
                  <Icon size={16} />
                  <span className="font-medium">{folder.label}</span>
                  {isSent && (
                    <ChevronDown size={14} className={`transition-transform ${showSentSubs && isActive ? 'rotate-180' : ''}`} />
                  )}
                </button>

                {isSent && showSentSubs && isActive && EMAIL_SENT_SUBFOLDERS.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => onSentSubfolderChange(sub.id as SentSubfolder)}
                    className={`px-2 py-1 rounded text-xs transition-colors whitespace-nowrap ${
                      sentSubfolder === sub.id ? activeBgClass : `${mutedClass} ${hoverClass}`
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </React.Fragment>
            );
          })}

          {/* Folders dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setFoldersOpen(!foldersOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors whitespace-nowrap ${
                isSecondaryActive ? activeBgClass : `${mutedClass} ${hoverClass}`
              }`}
            >
              <FolderOpen size={16} />
              <span className="font-medium">{activeFolderLabel || 'Folders'}</span>
              <ChevronDown size={14} className={`transition-transform ${foldersOpen ? 'rotate-180' : ''}`} />
            </button>

            {foldersOpen && (
              <div className={`absolute top-full left-0 mt-1 ${dropdownBg} border ${borderClass} rounded-lg shadow-lg z-50 min-w-[200px]`}>
                {secondaryFolders.map((folder) => {
                  const Icon = folder.icon;
                  const isActive = activeFolder === folder.id;
                  const subfolders = getSubfolders(folder.id);

                  return (
                    <div key={folder.id}>
                      <button
                        onClick={() => {
                          onFolderChange(folder.id);
                          if (subfolders.length <= 1) setFoldersOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                          isActive ? activeBgClass : `${textClass} ${hoverClass}`
                        }`}
                      >
                        <Icon size={16} />
                        <span className="font-medium">{folder.label}</span>
                      </button>

                      {isActive && subfolders.length > 1 && (
                        <div className={`border-t ${borderClass}`}>
                          {subfolders.map((sub) => (
                            <button
                              key={sub.id}
                              onClick={() => {
                                handleSubfolderChange(folder.id, sub.id);
                                onFolderChange(folder.id);
                                setFoldersOpen(false);
                              }}
                              className={`w-full text-left pl-9 pr-3 py-1.5 text-xs transition-colors ${
                                activeSubfolder[folder.id] === sub.id
                                  ? `${isLight ? 'bg-blue-50 text-blue-700' : 'bg-emerald-900/30 text-emerald-400'}`
                                  : `${mutedClass} ${hoverClass}`
                              }`}
                            >
                              {sub.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Compose + Refresh buttons */}
          <button
            onClick={onCompose}
            className={`flex items-center justify-center p-2 rounded-lg transition-all ${primaryBtnClass}`}
            title="Compose"
          >
            <Plus size={18} />
          </button>
          <button
            onClick={onRefresh}
            disabled={loading}
            className={`flex items-center justify-center p-2 rounded-lg transition-all border ${
              isLight
                ? 'text-slate-700 hover:bg-slate-100 border-slate-300'
                : 'text-gray-300 hover:bg-gray-700 border-gray-600'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
    </div>
  );
}

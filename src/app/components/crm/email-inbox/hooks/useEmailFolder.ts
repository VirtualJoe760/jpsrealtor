// useEmailFolder hook - Manages folder and subfolder navigation

import { useState, useCallback } from 'react';
import type { FolderType, SentSubfolder } from '../types';

export function useEmailFolder(initialFolder: FolderType = 'inbox') {
  const [activeFolder, setActiveFolder] = useState<FolderType>(initialFolder);
  const [sentSubfolder, setSentSubfolder] = useState<SentSubfolder>('all');

  const changeFolder = useCallback((folder: FolderType) => {
    setActiveFolder(folder);
    if (folder !== 'sent') {
      setSentSubfolder('all');
    }
  }, []);

  const changeSentSubfolder = useCallback((subfolder: SentSubfolder) => {
    setSentSubfolder(subfolder);
  }, []);

  return {
    activeFolder,
    sentSubfolder,
    changeFolder,
    changeSentSubfolder,
  };
}

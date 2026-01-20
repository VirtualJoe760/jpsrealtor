// useEmailFolder hook - Manages folder and subfolder navigation

import { useState, useCallback } from 'react';
import { FolderType, SentSubfolder } from '../types';

export function useEmailFolder(initialFolder: FolderType = FolderType.INBOX) {
  const [activeFolder, setActiveFolder] = useState<FolderType>(initialFolder);
  const [sentSubfolder, setSentSubfolder] = useState<SentSubfolder>(SentSubfolder.ALL);

  const changeFolder = useCallback((folder: FolderType) => {
    setActiveFolder(folder);
    if (folder !== FolderType.SENT) {
      setSentSubfolder(SentSubfolder.ALL);
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

// useAttachments hook - Manages email attachments

import { useState, useCallback } from 'react';
import { validateAttachment, validateTotalAttachmentsSize } from '../utils';
import { VALIDATION } from '../constants';

export function useAttachments() {
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  // Add single attachment with validation
  const addAttachment = useCallback((file: File): boolean => {
    const validation = validateAttachment(file);

    if (!validation.isValid) {
      setUploadErrors(validation.errors);
      return false;
    }

    // Check total attachments limit
    if (attachments.length >= VALIDATION.maxAttachments) {
      setUploadErrors([`Maximum ${VALIDATION.maxAttachments} attachments allowed`]);
      return false;
    }

    // Check total size limit
    const totalValidation = validateTotalAttachmentsSize([...attachments, file]);
    if (!totalValidation.isValid) {
      setUploadErrors(totalValidation.errors);
      return false;
    }

    setAttachments(prev => [...prev, file]);
    setUploadErrors([]);
    return true;
  }, [attachments]);

  // Add multiple attachments
  const addAttachments = useCallback((files: File[]): { added: number; failed: number } => {
    let added = 0;
    let failed = 0;

    files.forEach(file => {
      if (addAttachment(file)) {
        added++;
      } else {
        failed++;
      }
    });

    return { added, failed };
  }, [addAttachment]);

  // Remove attachment by index
  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
    setUploadErrors([]);
  }, []);

  // Remove attachment by file name
  const removeAttachmentByName = useCallback((fileName: string) => {
    setAttachments(prev => prev.filter(file => file.name !== fileName));
    setUploadErrors([]);
  }, []);

  // Clear all attachments
  const clearAttachments = useCallback(() => {
    setAttachments([]);
    setUploadErrors([]);
  }, []);

  // Get total size of all attachments
  const getTotalSize = useCallback((): number => {
    return attachments.reduce((sum, file) => sum + file.size, 0);
  }, [attachments]);

  // Check if attachment with same name exists
  const hasAttachment = useCallback((fileName: string): boolean => {
    return attachments.some(file => file.name === fileName);
  }, [attachments]);

  // Clear upload errors
  const clearErrors = useCallback(() => {
    setUploadErrors([]);
  }, []);

  // Handle file input change
  const handleFileInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      addAttachments(Array.from(files));
    }
    // Reset input value to allow selecting same file again
    event.target.value = '';
  }, [addAttachments]);

  return {
    attachments,
    uploadErrors,
    addAttachment,
    addAttachments,
    removeAttachment,
    removeAttachmentByName,
    clearAttachments,
    getTotalSize,
    hasAttachment,
    clearErrors,
    handleFileInput,
  };
}

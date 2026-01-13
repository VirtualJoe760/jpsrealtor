import { useState, useRef } from 'react';
import { validatePhotoFile, uploadContactPhoto, deleteContactPhoto } from '../utils/photoUtils';

export function useContactPhoto(contactId: string, initialPhoto?: string) {
  const [currentPhoto, setCurrentPhoto] = useState(initialPhoto || '');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validatePhotoFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setUploadingPhoto(true);
    try {
      const result = await uploadContactPhoto(contactId, file);
      if (result.success && result.photo) {
        setCurrentPhoto(result.photo);
        console.log('[useContactPhoto] Photo uploaded successfully');
      } else {
        console.error('[useContactPhoto] Failed to upload photo:', result.error);
        alert('Failed to upload photo: ' + result.error);
      }
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePhotoDelete = async () => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    setUploadingPhoto(true);
    try {
      const result = await deleteContactPhoto(contactId);
      if (result.success) {
        setCurrentPhoto('');
        console.log('[useContactPhoto] Photo deleted successfully');
      } else {
        console.error('[useContactPhoto] Failed to delete photo:', result.error);
        alert('Failed to delete photo: ' + result.error);
      }
    } finally {
      setUploadingPhoto(false);
    }
  };

  return {
    currentPhoto,
    uploadingPhoto,
    fileInputRef,
    handlePhotoUpload,
    handlePhotoDelete,
  };
}

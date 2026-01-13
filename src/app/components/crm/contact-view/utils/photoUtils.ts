export function validatePhotoFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' };
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return { valid: false, error: 'File too large. Maximum size is 5MB.' };
  }

  return { valid: true };
}

export async function uploadContactPhoto(contactId: string, file: File): Promise<{ success: boolean; photo?: string; error?: string }> {
  const formData = new FormData();
  formData.append('photo', file);

  try {
    const response = await fetch(`/api/crm/contacts/${contactId}/photo`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (data.success) {
      return { success: true, photo: data.photo };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.error('[photoUtils] Error uploading photo:', error);
    return { success: false, error: 'Error uploading photo' };
  }
}

export async function deleteContactPhoto(contactId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/crm/contacts/${contactId}/photo`, {
      method: 'DELETE',
    });

    const data = await response.json();
    if (data.success) {
      return { success: true };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.error('[photoUtils] Error deleting photo:', error);
    return { success: false, error: 'Error deleting photo' };
  }
}

import { useState } from 'react';

export function useContactStatus(contactId: string, initialStatus?: string) {
  const [currentStatus, setCurrentStatus] = useState(initialStatus || 'uncontacted');
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const response = await fetch(`/api/crm/contacts/${contactId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (data.success) {
        setCurrentStatus(newStatus);
        setIsEditingStatus(false);
        console.log(`[useContactStatus] Updated contact status to: ${newStatus}`);
      } else {
        console.error('[useContactStatus] Failed to update status:', data.error);
        alert('Failed to update status: ' + data.error);
      }
    } catch (error) {
      console.error('[useContactStatus] Error updating status:', error);
      alert('Error updating status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  return {
    currentStatus,
    isEditingStatus,
    setIsEditingStatus,
    updatingStatus,
    handleStatusChange,
  };
}

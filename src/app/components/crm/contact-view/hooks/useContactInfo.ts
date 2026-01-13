import { useState } from 'react';
import type { Contact, PhoneEntry, EmailEntry } from '../types';

export function useContactInfo(contact: Contact) {
  const [isEditingContactInfo, setIsEditingContactInfo] = useState(false);
  const [editedPhones, setEditedPhones] = useState<PhoneEntry[]>(
    (contact as any).phones || (contact.phone ? [{ number: contact.phone, label: 'mobile', isPrimary: true }] : [])
  );
  const [editedEmails, setEditedEmails] = useState<EmailEntry[]>(
    (contact as any).emails || (contact.email ? [{ address: contact.email, label: 'personal', isPrimary: true }] : [])
  );
  const [savingContactInfo, setSavingContactInfo] = useState(false);

  const handleAddPhone = () => {
    setEditedPhones([...editedPhones, { number: '', label: 'mobile', isPrimary: false }]);
  };

  const handleRemovePhone = (index: number) => {
    setEditedPhones(editedPhones.filter((_, i) => i !== index));
  };

  const handlePhoneChange = (index: number, field: 'number' | 'label' | 'isPrimary', value: string | boolean) => {
    const updated = [...editedPhones];
    if (field === 'isPrimary' && value === true) {
      // Set all other phones to not primary
      updated.forEach((p, i) => {
        p.isPrimary = i === index;
      });
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setEditedPhones(updated);
  };

  const handleAddEmail = () => {
    setEditedEmails([...editedEmails, { address: '', label: 'personal', isPrimary: false }]);
  };

  const handleRemoveEmail = (index: number) => {
    setEditedEmails(editedEmails.filter((_, i) => i !== index));
  };

  const handleEmailChange = (index: number, field: 'address' | 'label' | 'isPrimary', value: string | boolean) => {
    const updated = [...editedEmails];
    if (field === 'isPrimary' && value === true) {
      // Set all other emails to not primary
      updated.forEach((e, i) => {
        e.isPrimary = i === index;
      });
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setEditedEmails(updated);
  };

  const handleSaveContactInfo = async () => {
    setSavingContactInfo(true);
    try {
      const response = await fetch(`/api/crm/contacts/${contact._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phones: editedPhones.filter(p => p.number.trim()),
          emails: editedEmails.filter(e => e.address.trim()),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setIsEditingContactInfo(false);
        console.log('[useContactInfo] Contact info updated successfully');
        // Optionally refresh the page or update parent
        window.location.reload();
      } else {
        console.error('[useContactInfo] Failed to update contact info:', data.error);
        alert('Failed to update contact info: ' + data.error);
      }
    } catch (error) {
      console.error('[useContactInfo] Error updating contact info:', error);
      alert('Error updating contact info');
    } finally {
      setSavingContactInfo(false);
    }
  };

  const handleCancelContactInfoEdit = () => {
    setEditedPhones(
      (contact as any).phones || (contact.phone ? [{ number: contact.phone, label: 'mobile', isPrimary: true }] : [])
    );
    setEditedEmails(
      (contact as any).emails || (contact.email ? [{ address: contact.email, label: 'personal', isPrimary: true }] : [])
    );
    setIsEditingContactInfo(false);
  };

  return {
    isEditingContactInfo,
    setIsEditingContactInfo,
    editedPhones,
    editedEmails,
    savingContactInfo,
    handleAddPhone,
    handleRemovePhone,
    handlePhoneChange,
    handleAddEmail,
    handleRemoveEmail,
    handleEmailChange,
    handleSaveContactInfo,
    handleCancelContactInfoEdit,
  };
}

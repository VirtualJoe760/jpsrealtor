/**
 * Conversation utility functions
 */

import { Conversation, Contact } from '../types';

export function createNewConversation(contact: Contact): Conversation {
  return {
    phoneNumber: contact.phone,
    contactId: contact._id,
    contactName: `${contact.firstName} ${contact.lastName}`,
    contactInfo: {
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      status: contact.status,
      tags: contact.tags,
      smsOptIn: contact.preferences?.smsOptIn || false,
    },
    lastMessage: {
      _id: '',
      body: '',
      direction: 'outbound',
      status: '',
      createdAt: new Date().toISOString(),
    },
    messageCount: 0,
    unreadCount: 0,
  };
}

export function findExistingConversation(
  phoneNumber: string,
  conversations: Conversation[]
): Conversation | undefined {
  return conversations.find(c => c.phoneNumber === phoneNumber);
}

/**
 * Type definitions for SMS Messages feature
 */

export interface SMSMessage {
  _id: string;
  from: string;
  to: string;
  body: string;
  direction: 'inbound' | 'outbound';
  status: string;
  createdAt: string;
}

export interface Conversation {
  phoneNumber: string;
  contactId?: string;
  contactName?: string | null;
  contactInfo?: {
    firstName: string;
    lastName: string;
    email?: string;
    status?: string;
    tags?: string[];
    smsOptIn: boolean;
  } | null;
  lastMessage: {
    _id: string;
    body: string;
    direction: 'inbound' | 'outbound';
    status: string;
    createdAt: string;
  };
  messageCount: number;
  unreadCount: number;
}

export interface Contact {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  status?: string;
  tags?: string[];
  preferences?: {
    smsOptIn: boolean;
  };
}

export type MobileView = 'list' | 'thread';

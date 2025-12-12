'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Phone, User, Check, CheckCheck, X, AlertCircle } from 'lucide-react';

interface SMSMessage {
  _id: string;
  from: string;
  to: string;
  body: string;
  direction: 'inbound' | 'outbound';
  status: string;
  createdAt: string;
  deliveredAt?: string;
  contactId?: string;
}

interface Contact {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  preferences?: {
    smsOptIn: boolean;
  };
}

interface MessagingTabProps {
  isLight: boolean;
}

export default function MessagingTab({ isLight }: MessagingTabProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [messageBody, setMessageBody] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch contacts with SMS opt-in
  useEffect(() => {
    fetchContacts();
  }, []);

  // Fetch messages when contact is selected
  useEffect(() => {
    if (selectedContact) {
      fetchMessages(selectedContact._id);
    }
  }, [selectedContact]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/crm/contacts?limit=100');
      const data = await response.json();

      if (data.success) {
        // Filter contacts with SMS opt-in
        const smsContacts = data.contacts.filter(
          (c: Contact) => c.preferences?.smsOptIn && c.phone
        );
        setContacts(smsContacts);
      }
    } catch (error) {
      console.error('[Messaging] Fetch contacts error:', error);
    }
  };

  const fetchMessages = async (contactId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/crm/sms/messages?contactId=${contactId}`);
      const data = await response.json();

      if (data.success) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('[Messaging] Fetch messages error:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact || !messageBody.trim()) return;

    setSending(true);

    try {
      const response = await fetch('/api/crm/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedContact.phone,
          body: messageBody,
          contactId: selectedContact._id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessageBody('');
        // Refresh messages
        fetchMessages(selectedContact._id);
      } else {
        alert(data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('[Messaging] Send error:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-300px)]">
      {/* Contacts Sidebar */}
      <div className={`col-span-4 border rounded-lg overflow-hidden flex flex-col ${
        isLight ? 'bg-white border-slate-200' : 'bg-gray-800 border-gray-700'
      }`}>
        {/* Sidebar Header */}
        <div className={`p-4 border-b ${
          isLight ? 'border-slate-200' : 'border-gray-700'
        }`}>
          <h3 className={`text-lg font-semibold flex items-center gap-2 ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            <MessageSquare className="w-5 h-5" />
            SMS Contacts
          </h3>
          <p className={`text-sm mt-1 ${
            isLight ? 'text-slate-600' : 'text-gray-400'
          }`}>
            {contacts.length} contacts with SMS opt-in
          </p>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto">
          {contacts.length === 0 ? (
            <div className={`text-center py-12 px-4 ${
              isLight ? 'text-slate-600' : 'text-gray-400'
            }`}>
              <Phone className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No contacts with SMS opt-in</p>
              <p className="text-xs mt-1">Enable SMS for contacts to start messaging</p>
            </div>
          ) : (
            contacts.map((contact) => (
              <button
                key={contact._id}
                onClick={() => setSelectedContact(contact)}
                className={`w-full text-left p-4 border-b transition-all ${
                  selectedContact?._id === contact._id
                    ? isLight
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-emerald-900/20 border-emerald-500/50'
                    : isLight
                    ? 'border-slate-200 hover:bg-slate-50'
                    : 'border-gray-700 hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isLight ? 'bg-blue-100 text-blue-600' : 'bg-emerald-900/30 text-emerald-400'
                  }`}>
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium truncate ${
                      isLight ? 'text-slate-900' : 'text-white'
                    }`}>
                      {contact.firstName} {contact.lastName}
                    </div>
                    <div className={`text-sm truncate ${
                      isLight ? 'text-slate-600' : 'text-gray-400'
                    }`}>
                      {contact.phone}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Messages Panel */}
      <div className={`col-span-8 border rounded-lg overflow-hidden flex flex-col ${
        isLight ? 'bg-white border-slate-200' : 'bg-gray-800 border-gray-700'
      }`}>
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className={`p-4 border-b ${
              isLight ? 'border-slate-200 bg-slate-50' : 'border-gray-700 bg-gray-900'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isLight ? 'bg-blue-100 text-blue-600' : 'bg-emerald-900/30 text-emerald-400'
                }`}>
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className={`font-semibold ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}>
                    {selectedContact.firstName} {selectedContact.lastName}
                  </div>
                  <div className={`text-sm ${
                    isLight ? 'text-slate-600' : 'text-gray-400'
                  }`}>
                    {selectedContact.phone}
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${
              isLight ? 'bg-slate-50' : 'bg-gray-900/50'
            }`}>
              {loading ? (
                <div className={`text-center py-8 ${
                  isLight ? 'text-slate-600' : 'text-gray-400'
                }`}>
                  Loading messages...
                </div>
              ) : messages.length === 0 ? (
                <div className={`text-center py-8 ${
                  isLight ? 'text-slate-600' : 'text-gray-400'
                }`}>
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No messages yet</p>
                  <p className="text-sm mt-1">Send your first message below</p>
                </div>
              ) : (
                messages.map((message) => {
                  const isOutbound = message.direction === 'outbound';
                  return (
                    <div
                      key={message._id}
                      className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] ${isOutbound ? 'text-right' : 'text-left'}`}>
                        {/* Message Bubble */}
                        <div className={`inline-block px-4 py-2 rounded-2xl ${
                          isOutbound
                            ? isLight
                              ? 'bg-blue-600 text-white'
                              : 'bg-emerald-600 text-white'
                            : isLight
                            ? 'bg-white border border-slate-200 text-slate-900'
                            : 'bg-gray-800 border border-gray-700 text-white'
                        }`}>
                          <p className="whitespace-pre-wrap break-words">{message.body}</p>
                        </div>

                        {/* Timestamp and Status */}
                        <div className={`flex items-center gap-2 mt-1 text-xs ${
                          isOutbound ? 'justify-end' : 'justify-start'
                        } ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>
                          <span>
                            {new Date(message.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isOutbound && (
                            <>
                              {message.status === 'delivered' ? (
                                <CheckCheck className="w-4 h-4 text-blue-500" />
                              ) : message.status === 'sent' ? (
                                <Check className="w-4 h-4" />
                              ) : message.status === 'failed' ? (
                                <AlertCircle className="w-4 h-4 text-red-500" />
                              ) : (
                                <span className="text-xs">Sending...</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={sendMessage} className={`p-4 border-t ${
              isLight ? 'border-slate-200 bg-white' : 'border-gray-700 bg-gray-800'
            }`}>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <textarea
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(e);
                      }
                    }}
                    placeholder="Type your message... (Shift+Enter for new line)"
                    rows={2}
                    className={`w-full px-3 py-2 rounded-lg border resize-none ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                        : 'bg-gray-900 border-gray-700 text-white placeholder-gray-500'
                    }`}
                  />
                  <div className={`text-xs mt-1 ${
                    isLight ? 'text-slate-500' : 'text-gray-500'
                  }`}>
                    {messageBody.length}/160 characters
                    {messageBody.length > 160 && ` (${Math.ceil(messageBody.length / 160)} segments)`}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={sending || !messageBody.trim()}
                  className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    isLight
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {sending ? (
                    <span>Sending...</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className={`flex-1 flex items-center justify-center ${
            isLight ? 'text-slate-600' : 'text-gray-400'
          }`}>
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Select a contact to start messaging</p>
              <p className="text-sm mt-1">Choose a contact from the list on the left</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

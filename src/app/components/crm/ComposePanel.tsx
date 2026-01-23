'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, Paperclip, Minus, Maximize2, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Link as LinkIcon, Type, FileText, Palette, RefreshCw } from 'lucide-react';
import ContactAutocomplete from './ContactAutocomplete';

interface Email {
  id: string;
  to: string[];
  from: string;
  subject: string;
  html?: string;
  text?: string;
  created_at: string;
}

interface ComposePanelProps {
  isLight: boolean;
  onClose: () => void;
  onSend?: () => void;
  // Reply/Forward props
  replyTo?: Email;
  forwardEmail?: Email;
}

export default function ComposePanel({ isLight, onClose, onSend, replyTo, forwardEmail }: ComposePanelProps) {
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Initialize reply or forward data
  useEffect(() => {
    if (replyTo) {
      // Reply mode
      setTo(replyTo.from);
      setSubject(replyTo.subject.startsWith('Re: ') ? replyTo.subject : `Re: ${replyTo.subject}`);

      const originalMessage = replyTo.html || replyTo.text || '';
      const quotedMessage = `
        <br><br>
        <div style="border-left: 2px solid #ccc; padding-left: 12px; margin-left: 8px; color: #666;">
          <p style="margin: 0 0 8px 0;"><strong>On ${new Date(replyTo.created_at).toLocaleString()}, ${replyTo.from} wrote:</strong></p>
          ${originalMessage}
        </div>
      `;
      setMessage(quotedMessage);
      if (editorRef.current) {
        editorRef.current.innerHTML = quotedMessage;
      }
    } else if (forwardEmail) {
      // Forward mode
      setSubject(forwardEmail.subject.startsWith('Fwd: ') ? forwardEmail.subject : `Fwd: ${forwardEmail.subject}`);

      const originalMessage = forwardEmail.html || forwardEmail.text || '';
      const forwardedMessage = `
        <br><br>
        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 12px; background: #f9f9f9;">
          <p style="margin: 0 0 8px 0; font-weight: bold;">---------- Forwarded message ----------</p>
          <p style="margin: 4px 0;"><strong>From:</strong> ${forwardEmail.from}</p>
          <p style="margin: 4px 0;"><strong>Date:</strong> ${new Date(forwardEmail.created_at).toLocaleString()}</p>
          <p style="margin: 4px 0;"><strong>Subject:</strong> ${forwardEmail.subject}</p>
          <p style="margin: 4px 0;"><strong>To:</strong> ${forwardEmail.to.join(', ')}</p>
          <hr style="margin: 12px 0; border: none; border-top: 1px solid #ddd;">
          ${originalMessage}
        </div>
      `;
      setMessage(forwardedMessage);
      if (editorRef.current) {
        editorRef.current.innerHTML = forwardedMessage;
      }
    }
  }, [replyTo, forwardEmail]);

  // Link modal state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');

  // Template & formatting state
  const [showTemplates, setShowTemplates] = useState(false);
  const [currentFont, setCurrentFont] = useState('Arial');
  const [currentFontSize, setCurrentFontSize] = useState('14px');
  const [currentColor, setCurrentColor] = useState('#000000');

  // AI modal state
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);

  // Email templates
  const templates = [
    {
      name: 'Quick Response',
      subject: 'Re: Your Inquiry',
      body: '<p>Thank you for reaching out!</p><p>I appreciate your interest and will get back to you shortly with more information.</p><p>Best regards,<br><strong>Joseph Sardella</strong><br>eXp Realty</p>'
    },
    {
      name: 'Property Inquiry',
      subject: 'Property Information',
      body: '<p>Hi there,</p><p>Thank you for your interest in the property. I\'d be happy to provide you with more details and schedule a showing.</p><p>Please let me know your availability and I\'ll arrange a convenient time.</p><p>Best regards,<br><strong>Joseph Sardella</strong><br>eXp Realty<br>📞 (760) 333-2674</p>'
    },
    {
      name: 'Follow Up',
      subject: 'Following Up',
      body: '<p>Hi,</p><p>I wanted to follow up on our recent conversation. Do you have any questions or need additional information?</p><p>I\'m here to help!</p><p>Best regards,<br><strong>Joseph Sardella</strong><br>eXp Realty</p>'
    },
    {
      name: 'Thank You',
      subject: 'Thank You',
      body: '<p>Hi,</p><p>Thank you for your time today. It was great speaking with you!</p><p>Please don\'t hesitate to reach out if you have any questions.</p><p>Best regards,<br><strong>Joseph Sardella</strong><br>eXp Realty<br>📧 josephsardella@gmail.com</p>'
    },
    {
      name: 'Professional Signature',
      subject: '',
      body: '<br><br><hr style="border: 1px solid #e5e7eb;"><div style="font-family: Arial, sans-serif;"><p style="margin: 0;"><strong style="font-size: 16px; color: #1e40af;">Joseph Sardella</strong></p><p style="margin: 4px 0; color: #6b7280;">Real Estate Professional</p><p style="margin: 4px 0; color: #6b7280;">eXp Realty - Obsidian Group</p><p style="margin: 8px 0 4px 0;"><strong>DRE#:</strong> 02105816</p><p style="margin: 4px 0;"><strong>📞</strong> (760) 333-2674</p><p style="margin: 4px 0;"><strong>📧</strong> josephsardella@gmail.com</p><p style="margin: 4px 0;"><strong>🌐</strong> <a href="https://www.obsidiangroup.com" style="color: #3b82f6;">www.obsidiangroup.com</a></p></div>'
    }
  ];

  // Rich text formatting functions
  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const applyTemplate = (template: typeof templates[0]) => {
    if (template.subject) setSubject(template.subject);
    if (editorRef.current) {
      editorRef.current.innerHTML = template.body;
      setMessage(template.body);
    }
    setShowTemplates(false);
  };

  const handleFontChange = (font: string) => {
    setCurrentFont(font);
    formatText('fontName', font);
  };

  const handleFontSizeChange = (size: string) => {
    setCurrentFontSize(size);
    formatText('fontSize', '3');
    // Apply custom size via CSS
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      span.style.fontSize = size;
      range.surroundContents(span);
    }
  };

  const handleColorChange = (color: string) => {
    setCurrentColor(color);
    formatText('foreColor', color);
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return;

    setAiGenerating(true);
    try {
      const response = await fetch('/api/ai/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt }),
      });

      const data = await response.json();

      if (response.ok && data.content) {
        if (editorRef.current) {
          editorRef.current.innerHTML = data.content;
          setMessage(data.content);
        }
        setShowAIModal(false);
        setAiPrompt('');
      }
    } catch (error) {
      console.error('AI generation failed:', error);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append('to', to);
      if (cc) formData.append('cc', cc);
      if (bcc) formData.append('bcc', bcc);
      formData.append('subject', subject);
      formData.append('message', message);

      attachments.forEach((file) => {
        formData.append('attachments', file);
      });

      const response = await fetch('/api/resend/send', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send email');
      } else {
        setSuccess(true);
        onSend?.();
        setTimeout(() => {
          onClose();
        }, 1000);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setSending(false);
    }
  };

  const handleAddAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments([...attachments, ...Array.from(e.target.files)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleInsertLink = () => {
    if (linkUrl) {
      const selection = window.getSelection();
      const selectedText = selection?.toString() || linkText || linkUrl;
      const linkHtml = `<a href="${linkUrl}" style="color: #3b82f6; text-decoration: underline;">${selectedText}</a>`;
      formatText('insertHTML', linkHtml);
      setShowLinkModal(false);
      setLinkUrl('');
      setLinkText('');
    }
  };

  if (isMinimized) {
    return (
      <div className={`hidden md:block fixed bottom-0 right-8 z-50 w-96 rounded-t-lg shadow-lg cursor-pointer ${
        isLight ? 'bg-slate-800' : 'bg-gray-900'
      }`} onClick={() => setIsMinimized(false)}>
        <div className="px-4 py-3 flex items-center justify-between text-white">
          <span className="text-sm font-medium truncate">New Message</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="hover:bg-white/10 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed ${isMaximized ? 'inset-4 md:inset-8' : 'inset-0 md:inset-auto md:bottom-0 md:right-8 md:w-full md:max-w-2xl'} z-50 flex flex-col md:rounded-t-xl shadow-2xl ${
        isLight ? 'bg-white' : 'bg-gray-800'
      }`}
      style={!isMaximized ? { height: '100vh' } : {}}
    >
      <style jsx>{`
        @media (min-width: 768px) {
          div {
            height: 650px !important;
          }
        }
      `}</style>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 md:rounded-t-xl ${
        isLight ? 'bg-slate-800' : 'bg-gray-900'
      }`}>
        <h3 className="text-white font-medium text-base sm:text-lg">
          {replyTo ? 'Reply' : forwardEmail ? 'Forward' : 'New Message'}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="hidden md:block hover:bg-white/10 p-2 rounded text-white"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="hidden md:block hover:bg-white/10 p-2 rounded text-white"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="hover:bg-white/10 p-2 rounded text-white"
          >
            <X className="w-5 h-5 md:w-4 md:h-4" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden relative">
        {/* To Field with Autocomplete */}
        <div className={`px-4 py-2 border-b ${isLight ? 'border-slate-200' : 'border-gray-700'}`}>
          <div className="flex items-center gap-2">
            <label className={`text-sm font-medium w-16 ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>To</label>
            <ContactAutocomplete
              value={to}
              onChange={setTo}
              placeholder="Recipients"
              isLight={isLight}
              required
              multiple
            />
          </div>
        </div>

        {/* CC/BCC Toggle Buttons and Fields */}
        <div className={`px-4 py-2 border-b ${isLight ? 'border-slate-200' : 'border-gray-700'}`}>
          <div className="flex items-start gap-2">
            <div className="w-16 flex items-center gap-1 pt-1">
              {!showCc && (
                <button
                  type="button"
                  onClick={() => setShowCc(true)}
                  className={`text-xs px-2 py-0.5 rounded hover:bg-opacity-20 transition-all ${
                    isLight ? 'text-blue-600 hover:bg-blue-600' : 'text-emerald-400 hover:bg-emerald-400'
                  }`}
                >
                  Cc
                </button>
              )}
              {!showBcc && (
                <button
                  type="button"
                  onClick={() => setShowBcc(true)}
                  className={`text-xs px-2 py-0.5 rounded hover:bg-opacity-20 transition-all ${
                    isLight ? 'text-blue-600 hover:bg-blue-600' : 'text-emerald-400 hover:bg-emerald-400'
                  }`}
                >
                  Bcc
                </button>
              )}
            </div>
            <div className="flex-1 flex flex-col gap-2">
              {showCc && (
                <div className="flex items-center gap-2">
                  <label className={`text-sm font-medium w-8 ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>Cc</label>
                  <ContactAutocomplete
                    value={cc}
                    onChange={setCc}
                    placeholder="Carbon copy recipients (comma separated)"
                    isLight={isLight}
                    multiple
                  />
                  <button
                    type="button"
                    onClick={() => { setShowCc(false); setCc(''); }}
                    className={`text-sm hover:bg-opacity-10 p-1 rounded ${isLight ? 'text-slate-400 hover:bg-slate-400' : 'text-gray-500 hover:bg-gray-500'}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              {showBcc && (
                <div className="flex items-center gap-2">
                  <label className={`text-sm font-medium w-8 ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>Bcc</label>
                  <ContactAutocomplete
                    value={bcc}
                    onChange={setBcc}
                    placeholder="Blind carbon copy recipients (comma separated)"
                    isLight={isLight}
                    multiple
                  />
                  <button
                    type="button"
                    onClick={() => { setShowBcc(false); setBcc(''); }}
                    className={`text-sm hover:bg-opacity-10 p-1 rounded ${isLight ? 'text-slate-400 hover:bg-slate-400' : 'text-gray-500 hover:bg-gray-500'}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Subject Field with Template Button */}
        <div className={`px-4 py-2 border-b ${isLight ? 'border-slate-200' : 'border-gray-700'}`}>
          <div className="flex items-center gap-2">
            <label className={`text-sm font-medium w-16 ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={`flex-1 bg-transparent outline-none text-sm ${isLight ? 'text-slate-900' : 'text-gray-100'}`}
              placeholder="Subject"
              required
            />
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTemplates(!showTemplates)}
                className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-medium transition-all ${
                  isLight ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50'
                }`}
                title="Insert Template"
              >
                <FileText className="w-3 h-3" />
                Templates
              </button>

              {/* Template Dropdown */}
              {showTemplates && (
                <div className={`absolute right-0 top-full mt-1 w-64 rounded-lg shadow-xl border z-10 ${
                  isLight ? 'bg-white border-slate-200' : 'bg-gray-800 border-gray-700'
                }`}>
                  {templates.map((template, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => applyTemplate(template)}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        i === 0 ? 'rounded-t-lg' : ''
                      } ${
                        i === templates.length - 1 ? 'rounded-b-lg' : ''
                      } ${
                        isLight ? 'hover:bg-slate-100 text-slate-900' : 'hover:bg-gray-700 text-gray-100'
                      }`}
                    >
                      {template.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rich Text Toolbar */}
        <div className={`flex flex-wrap items-center gap-1 px-3 sm:px-4 py-2 border-b ${
          isLight ? 'border-slate-200 bg-slate-50' : 'border-gray-700 bg-gray-900'
        }`}>
          {/* Row 1 */}
          <div className="flex items-center gap-1 flex-wrap w-full sm:w-auto">
            {/* Font Family */}
            <select
              value={currentFont}
              onChange={(e) => handleFontChange(e.target.value)}
              className={`px-2 py-1 rounded text-xs border flex-shrink-0 ${
                isLight ? 'bg-white border-slate-300' : 'bg-gray-800 border-gray-600'
              }`}
              title="Font"
            >
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Times New Roman">Times</option>
              <option value="Georgia">Georgia</option>
              <option value="Verdana">Verdana</option>
            </select>

            {/* Font Size */}
            <select
              value={currentFontSize}
              onChange={(e) => handleFontSizeChange(e.target.value)}
              className={`px-2 py-1 rounded text-xs border flex-shrink-0 ${
                isLight ? 'bg-white border-slate-300' : 'bg-gray-800 border-gray-600'
              }`}
              title="Font Size"
            >
              <option value="10px">10</option>
              <option value="12px">12</option>
              <option value="14px">14</option>
              <option value="16px">16</option>
              <option value="18px">18</option>
              <option value="20px">20</option>
              <option value="24px">24</option>
            </select>

            {/* Text Color */}
            <label className="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-gray-700 cursor-pointer flex-shrink-0" title="Text Color">
              <Palette className="w-4 h-4" />
              <input
                type="color"
                value={currentColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="w-0 h-0 invisible"
              />
            </label>

            <div className={`w-px h-6 mx-1 flex-shrink-0 ${isLight ? 'bg-slate-300' : 'bg-gray-600'}`} />

            {/* Bold, Italic, Underline */}
            <button type="button" onClick={() => formatText('bold')} className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-gray-700 flex-shrink-0 ${isLight ? 'text-slate-700' : 'text-gray-300'}`} title="Bold">
              <Bold className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => formatText('italic')} className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-gray-700 flex-shrink-0 ${isLight ? 'text-slate-700' : 'text-gray-300'}`} title="Italic">
              <Italic className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => formatText('underline')} className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-gray-700 flex-shrink-0 ${isLight ? 'text-slate-700' : 'text-gray-300'}`} title="Underline">
              <Underline className="w-4 h-4" />
            </button>

            <div className={`w-px h-6 mx-1 flex-shrink-0 ${isLight ? 'bg-slate-300' : 'bg-gray-600'}`} />

            {/* Alignment */}
            <button type="button" onClick={() => formatText('justifyLeft')} className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-gray-700 flex-shrink-0 ${isLight ? 'text-slate-700' : 'text-gray-300'}`} title="Align Left">
              <AlignLeft className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => formatText('justifyCenter')} className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-gray-700 flex-shrink-0 ${isLight ? 'text-slate-700' : 'text-gray-300'}`} title="Align Center">
              <AlignCenter className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => formatText('justifyRight')} className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-gray-700 flex-shrink-0 ${isLight ? 'text-slate-700' : 'text-gray-300'}`} title="Align Right">
              <AlignRight className="w-4 h-4" />
            </button>

            <div className={`w-px h-6 mx-1 flex-shrink-0 ${isLight ? 'bg-slate-300' : 'bg-gray-600'}`} />

            {/* Link */}
            <button type="button" onClick={() => setShowLinkModal(true)} className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-gray-700 flex-shrink-0 ${isLight ? 'text-slate-700' : 'text-gray-300'}`} title="Insert Link">
              <LinkIcon className="w-4 h-4" />
            </button>

            {/* Attach */}
            <label className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-gray-700 cursor-pointer flex-shrink-0 ${isLight ? 'text-slate-700' : 'text-gray-300'}`} title="Attach File">
              <Paperclip className="w-4 h-4" />
              <input type="file" onChange={handleAddAttachment} multiple className="hidden" />
            </label>

            <div className={`w-px h-6 mx-1 flex-shrink-0 ${isLight ? 'bg-slate-300' : 'bg-gray-600'}`} />

            {/* AI Button */}
            <button
              type="button"
              onClick={() => setShowAIModal(true)}
              className={`flex items-center gap-1 px-3 py-1 rounded font-medium text-xs transition-all flex-shrink-0 ${
                isLight ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
              title="AI Generate"
            >
              <Type className="w-4 h-4" />
              AI
            </button>

            {/* Mobile Send Button */}
            <button
              type="submit"
              disabled={sending}
              className={`md:hidden flex items-center gap-1 px-4 py-1.5 rounded-lg font-medium text-xs transition-all flex-shrink-0 ml-auto ${
                sending ? 'opacity-50 cursor-not-allowed' : ''
              } ${isLight ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
            >
              <Send className="w-4 h-4" />
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>

        {/* Message Body */}
        <div className="flex-1 px-4 py-3 overflow-y-auto pb-28 sm:pb-3">
          <div
            ref={editorRef}
            contentEditable
            onInput={(e) => setMessage(e.currentTarget.innerHTML)}
            className={`min-h-full outline-none ${isLight ? 'text-slate-900' : 'text-gray-100'}`}
            style={{ fontSize: '14px', lineHeight: '1.5', fontFamily: currentFont }}
          />
        </div>

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className={`px-4 py-2 border-t ${isLight ? 'border-slate-200' : 'border-gray-700'}`}>
            <div className="flex flex-wrap gap-2">
              {attachments.map((file, i) => (
                <div key={i} className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${isLight ? 'bg-slate-100' : 'bg-gray-700'}`}>
                  <Paperclip className="w-3 h-3" />
                  <span>{file.name}</span>
                  <button type="button" onClick={() => removeAttachment(i)} className="hover:bg-red-100 rounded-full p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error/Success Messages */}
        {error && (
          <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-red-700 text-sm">{error}</div>
        )}
        {success && (
          <div className="px-4 py-2 bg-green-50 border-t border-green-200 text-green-700 text-sm">Email sent successfully!</div>
        )}

        {/* Footer - Desktop */}
        <div className={`hidden md:flex items-center justify-between px-4 py-4 border-t flex-shrink-0 ${isLight ? 'border-slate-200 bg-white' : 'border-gray-700 bg-gray-800'}`}>
          <button type="submit" disabled={sending} className={`flex items-center justify-center gap-2 px-6 py-2 rounded-lg font-medium transition-all text-base ${sending ? 'opacity-50 cursor-not-allowed' : ''} ${isLight ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
            <Send className="w-4 h-4" />
            {sending ? 'Sending...' : 'Send'}
          </button>
          <button type="button" onClick={onClose} className={`text-sm ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-gray-400 hover:text-gray-200'}`}>
            Discard
          </button>
        </div>
      </form>

      {/* AI Generate Modal */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className={`w-full max-w-lg rounded-xl shadow-2xl ${isLight ? 'bg-white' : 'bg-gray-800'}`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b ${isLight ? 'border-slate-200' : 'border-gray-700'}`}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
                  <Type className="w-5 h-5 text-white" />
                </div>
                <h3 className={`text-lg font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>AI Generate Email</h3>
              </div>
              <button
                onClick={() => { setShowAIModal(false); setAiPrompt(''); }}
                className={`p-2 rounded-lg transition-colors ${isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-gray-700 text-gray-400'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                  Describe the email you want to write
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className={`w-full h-32 px-4 py-3 rounded-lg border transition-all resize-none ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                      : 'bg-gray-900 border-gray-700 text-gray-100 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                  }`}
                  placeholder="Example: Write a professional follow-up email to a client about their property inquiry..."
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAIModal(false); setAiPrompt(''); }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    isLight ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAIGenerate}
                  disabled={!aiPrompt.trim() || aiGenerating}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
                    (!aiPrompt.trim() || aiGenerating) ? 'opacity-50 cursor-not-allowed' : ''
                  } bg-purple-600 text-white hover:bg-purple-700`}
                >
                  {aiGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Type className="w-4 h-4" />
                      Generate
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Link Insert Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className={`w-full max-w-md rounded-xl shadow-2xl ${isLight ? 'bg-white' : 'bg-gray-800'}`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b ${isLight ? 'border-slate-200' : 'border-gray-700'}`}>
              <h3 className={`text-lg font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Insert Link</h3>
              <button onClick={() => { setShowLinkModal(false); setLinkUrl(''); setLinkText(''); }} className={`p-2 rounded-lg transition-colors ${isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-gray-700 text-gray-400'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>Link Text (optional)</label>
                <input type="text" value={linkText} onChange={(e) => setLinkText(e.target.value)} className={`w-full px-4 py-2 rounded-lg border transition-all ${isLight ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20' : 'bg-gray-800 border-gray-700 text-gray-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'}`} placeholder="Click here" />
                <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Leave blank to use selected text or URL as link text</p>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>URL</label>
                <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className={`w-full px-4 py-2 rounded-lg border transition-all ${isLight ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20' : 'bg-gray-800 border-gray-700 text-gray-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'}`} placeholder="https://example.com" autoFocus />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4">
                <button type="button" onClick={() => { setShowLinkModal(false); setLinkUrl(''); setLinkText(''); }} className={`px-4 py-2 rounded-lg font-medium transition-all ${isLight ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>Cancel</button>
                <button type="button" onClick={handleInsertLink} disabled={!linkUrl} className={`px-4 py-2 rounded-lg font-medium transition-all ${!linkUrl ? 'opacity-50 cursor-not-allowed' : ''} ${isLight ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>Insert Link</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

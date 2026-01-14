# ComposePanel.tsx - Detailed Refactor Plan

**Component:** `src/app/components/crm/ComposePanel.tsx`
**Current Size:** 730 lines
**Current Hooks:** 18 React hooks
**Target Size:** ~200 lines
**Priority:** 🟡 HIGH
**Estimated Time:** 2 weeks

---

## Current State Analysis

### Problems Identified

1. **18 React Hooks** - Too many for a single component
2. **Rich Text Editor Embedded** - Should be extracted as reusable component
3. **Template System** - Should be separate component/service
4. **AI Generation Modal** - Should be separate component
5. **File Attachments** - Should be separate hook
6. **Reply/Forward Logic** - Complex initialization logic

### State Variables Breakdown

```typescript
// Email Fields (5 variables)
const [to, setTo] = useState('');
const [cc, setCc] = useState('');
const [bcc, setBcc] = useState('');
const [subject, setSubject] = useState('');
const [message, setMessage] = useState('');

// UI State (4 variables)
const [showCc, setShowCc] = useState(false);
const [showBcc, setShowBcc] = useState(false);
const [isMinimized, setIsMinimized] = useState(false);
const [isMaximized, setIsMaximized] = useState(false);

// Attachments (1 variable)
const [attachments, setAttachments] = useState<File[]>([]);

// Send State (3 variables)
const [sending, setSending] = useState(false);
const [error, setError] = useState<string | null>(null);
const [success, setSuccess] = useState(false);

// Link Modal (3 variables)
const [showLinkModal, setShowLinkModal] = useState(false);
const [linkUrl, setLinkUrl] = useState('');
const [linkText, setLinkText] = useState('');

// Templates (1 variable)
const [showTemplates, setShowTemplates] = useState(false);

// Formatting (3 variables)
const [currentFont, setCurrentFont] = useState('Arial');
const [currentFontSize, setCurrentFontSize] = useState('14px');
const [currentColor, setCurrentColor] = useState('#000000');

// AI (3 variables)
const [showAIModal, setShowAIModal] = useState(false);
const [aiPrompt, setAiPrompt] = useState('');
const [aiGenerating, setAiGenerating] = useState(false);
```

**Total: 23+ state variables across 7 feature areas**

---

## Refactoring Strategy

### Phase 1: Types & Constants (Day 1)

**Files to Create:**
```
src/app/components/crm/email/compose/
├── types/
│   ├── index.ts
│   └── interfaces.ts
└── constants/
    ├── emailTemplates.ts
    └── editorDefaults.ts
```

**Types:**

```typescript
// interfaces.ts
export interface EmailDraft {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  message: string;
  attachments: File[];
}

export interface EmailTemplate {
  name: string;
  subject: string;
  body: string;
  category?: 'response' | 'inquiry' | 'followup' | 'signature';
}

export interface EditorFormatting {
  font: string;
  fontSize: string;
  color: string;
}
```

**Constants:**

```typescript
// emailTemplates.ts
export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    name: 'Quick Response',
    subject: 'Re: Your Inquiry',
    body: '<p>Thank you for reaching out!</p><p>I appreciate your interest and will get back to you shortly with more information.</p><p>Best regards,<br><strong>Joseph Sardella</strong><br>eXp Realty</p>',
    category: 'response'
  },
  {
    name: 'Property Inquiry',
    subject: 'Property Information',
    body: '<p>Hi there,</p><p>Thank you for your interest in the property. I\'d be happy to provide you with more details and schedule a showing.</p>',
    category: 'inquiry'
  },
  // ... more templates
];

// editorDefaults.ts
export const DEFAULT_FONT = 'Arial';
export const DEFAULT_FONT_SIZE = '14px';
export const DEFAULT_COLOR = '#000000';

export const AVAILABLE_FONTS = [
  'Arial',
  'Times New Roman',
  'Courier New',
  'Georgia',
  'Verdana'
];

export const FONT_SIZES = [
  '10px', '12px', '14px', '16px', '18px', '20px', '24px'
];
```

---

### Phase 2: Custom Hooks (Day 2-4)

**Files to Create:**
```
src/app/components/crm/email/compose/
└── hooks/
    ├── index.ts
    ├── useEmailDraft.ts           # Email fields state
    ├── useEmailAttachments.ts     # File management
    ├── useEmailSend.ts            # Send logic
    ├── useEmailTemplates.ts       # Template selection
    ├── useRichTextEditor.ts       # Editor state
    └── useAIGeneration.ts         # AI modal & generation
```

#### Hook 1: useEmailDraft.ts

```typescript
export function useEmailDraft(
  initialTo?: string,
  initialSubject?: string,
  initialMessage?: string
) {
  const [to, setTo] = useState(initialTo || '');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState(initialSubject || '');
  const [message, setMessage] = useState(initialMessage || '');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);

  const getDraft = useCallback((): EmailDraft => ({
    to,
    cc,
    bcc,
    subject,
    message,
    attachments: [], // Managed by separate hook
  }), [to, cc, bcc, subject, message]);

  const reset = useCallback(() => {
    setTo('');
    setCc('');
    setBcc('');
    setSubject('');
    setMessage('');
    setShowCc(false);
    setShowBcc(false);
  }, []);

  const applyTemplate = useCallback((template: EmailTemplate) => {
    if (template.subject) setSubject(template.subject);
    setMessage(template.body);
  }, []);

  return {
    to, setTo,
    cc, setCc,
    bcc, setBcc,
    subject, setSubject,
    message, setMessage,
    showCc, setShowCc,
    showBcc, setShowBcc,
    getDraft,
    reset,
    applyTemplate,
  };
}
```

#### Hook 2: useEmailAttachments.ts

```typescript
export function useEmailAttachments() {
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return;

    const newFiles = Array.from(files);
    setAttachments(prev => [...prev, ...newFiles]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments([]);
  }, []);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const totalSize = attachments.reduce((sum, file) => sum + file.size, 0);
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);

  return {
    attachments,
    addFiles,
    removeFile,
    clearAttachments,
    triggerFileInput,
    fileInputRef,
    totalSize,
    totalSizeMB,
  };
}
```

#### Hook 3: useEmailSend.ts

```typescript
export function useEmailSend(onSuccess?: () => void) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const sendEmail = useCallback(async (draft: EmailDraft) => {
    // Validation
    if (!draft.to.trim()) {
      setError('Please enter a recipient');
      return;
    }

    if (!draft.subject.trim()) {
      setError('Please enter a subject');
      return;
    }

    setSending(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append('to', draft.to);
      if (draft.cc) formData.append('cc', draft.cc);
      if (draft.bcc) formData.append('bcc', draft.bcc);
      formData.append('subject', draft.subject);
      formData.append('html', draft.message);

      // Add attachments
      draft.attachments.forEach(file => {
        formData.append('attachments', file);
      });

      const response = await fetch('/api/resend/send', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  }, [onSuccess]);

  return {
    sending,
    error,
    success,
    sendEmail,
    clearError: () => setError(null),
  };
}
```

#### Hook 4: useRichTextEditor.ts

```typescript
export function useRichTextEditor() {
  const [currentFont, setCurrentFont] = useState(DEFAULT_FONT);
  const [currentFontSize, setCurrentFontSize] = useState(DEFAULT_FONT_SIZE);
  const [currentColor, setCurrentColor] = useState(DEFAULT_COLOR);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  }, []);

  const formatBold = useCallback(() => execCommand('bold'), [execCommand]);
  const formatItalic = useCallback(() => execCommand('italic'), [execCommand]);
  const formatUnderline = useCallback(() => execCommand('underline'), [execCommand]);
  const formatAlignLeft = useCallback(() => execCommand('justifyLeft'), [execCommand]);
  const formatAlignCenter = useCallback(() => execCommand('justifyCenter'), [execCommand]);
  const formatAlignRight = useCallback(() => execCommand('justifyRight'), [execCommand]);

  const changeFont = useCallback((font: string) => {
    setCurrentFont(font);
    execCommand('fontName', font);
  }, [execCommand]);

  const changeFontSize = useCallback((size: string) => {
    setCurrentFontSize(size);
    execCommand('fontSize', '3');
    // Apply size with inline style
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      span.style.fontSize = size;
      range.surroundContents(span);
    }
  }, [execCommand]);

  const changeColor = useCallback((color: string) => {
    setCurrentColor(color);
    execCommand('foreColor', color);
  }, [execCommand]);

  const insertLink = useCallback((url: string, text: string) => {
    execCommand('createLink', url);
    setShowLinkModal(false);
  }, [execCommand]);

  return {
    editorRef,
    currentFont,
    currentFontSize,
    currentColor,
    showLinkModal,
    setShowLinkModal,
    formatBold,
    formatItalic,
    formatUnderline,
    formatAlignLeft,
    formatAlignCenter,
    formatAlignRight,
    changeFont,
    changeFontSize,
    changeColor,
    insertLink,
  };
}
```

---

### Phase 3: UI Components (Day 5-8)

**Files to Create:**
```
src/app/components/crm/email/compose/
└── components/
    ├── index.ts
    ├── RichTextEditor.tsx         # Reusable editor!
    ├── EditorToolbar.tsx          # Formatting toolbar
    ├── EmailRecipientFields.tsx  # To/CC/BCC inputs
    ├── EmailTemplateSelector.tsx # Template modal
    ├── AttachmentList.tsx         # File list
    ├── AIEmailGenerator.tsx       # AI modal
    ├── LinkInsertModal.tsx        # Link dialog
    └── SendButton.tsx             # Send/sending state
```

#### Component: RichTextEditor.tsx (REUSABLE!)

```typescript
interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  editorRef: React.RefObject<HTMLDivElement>;
  isLight: boolean;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder,
  editorRef,
  isLight
}: RichTextEditorProps) {
  return (
    <div
      ref={editorRef}
      contentEditable
      className={`min-h-[300px] p-4 rounded-lg border focus:outline-none focus:ring-2 ${
        isLight
          ? 'bg-white border-gray-300 focus:ring-blue-500'
          : 'bg-gray-800 border-gray-700 focus:ring-emerald-500 text-white'
      }`}
      dangerouslySetInnerHTML={{ __html: content }}
      onInput={(e) => {
        onChange(e.currentTarget.innerHTML);
      }}
      data-placeholder={placeholder}
    />
  );
}
```

#### Component: EditorToolbar.tsx

```typescript
interface EditorToolbarProps {
  onBold: () => void;
  onItalic: () => void;
  onUnderline: () => void;
  onAlignLeft: () => void;
  onAlignCenter: () => void;
  onAlignRight: () => void;
  onLink: () => void;
  currentFont: string;
  onFontChange: (font: string) => void;
  currentFontSize: string;
  onFontSizeChange: (size: string) => void;
  currentColor: string;
  onColorChange: (color: string) => void;
  isLight: boolean;
}

export function EditorToolbar({ ... }: EditorToolbarProps) {
  return (
    <div className={`flex flex-wrap items-center gap-1 p-2 rounded-lg border ${
      isLight ? 'bg-gray-50 border-gray-200' : 'bg-gray-800 border-gray-700'
    }`}>
      {/* Text Formatting */}
      <button onClick={onBold} className="p-2 hover:bg-gray-200 rounded">
        <Bold className="w-4 h-4" />
      </button>
      <button onClick={onItalic} className="p-2 hover:bg-gray-200 rounded">
        <Italic className="w-4 h-4" />
      </button>
      <button onClick={onUnderline} className="p-2 hover:bg-gray-200 rounded">
        <Underline className="w-4 h-4" />
      </button>

      <div className="w-px h-6 bg-gray-300 mx-2" />

      {/* Alignment */}
      <button onClick={onAlignLeft} className="p-2 hover:bg-gray-200 rounded">
        <AlignLeft className="w-4 h-4" />
      </button>
      <button onClick={onAlignCenter} className="p-2 hover:bg-gray-200 rounded">
        <AlignCenter className="w-4 h-4" />
      </button>
      <button onClick={onAlignRight} className="p-2 hover:bg-gray-200 rounded">
        <AlignRight className="w-4 h-4" />
      </button>

      <div className="w-px h-6 bg-gray-300 mx-2" />

      {/* Font Selection */}
      <select value={currentFont} onChange={(e) => onFontChange(e.target.value)}>
        {AVAILABLE_FONTS.map(font => (
          <option key={font} value={font}>{font}</option>
        ))}
      </select>

      {/* Font Size */}
      <select value={currentFontSize} onChange={(e) => onFontSizeChange(e.target.value)}>
        {FONT_SIZES.map(size => (
          <option key={size} value={size}>{size}</option>
        ))}
      </select>

      {/* Color Picker */}
      <input
        type="color"
        value={currentColor}
        onChange={(e) => onColorChange(e.target.value)}
        className="w-8 h-8 rounded cursor-pointer"
      />

      <div className="w-px h-6 bg-gray-300 mx-2" />

      {/* Link */}
      <button onClick={onLink} className="p-2 hover:bg-gray-200 rounded">
        <LinkIcon className="w-4 h-4" />
      </button>
    </div>
  );
}
```

#### Component: EmailRecipientFields.tsx

```typescript
interface EmailRecipientFieldsProps {
  to: string;
  onToChange: (value: string) => void;
  cc: string;
  onCcChange: (value: string) => void;
  bcc: string;
  onBccChange: (value: string) => void;
  showCc: boolean;
  onToggleCc: () => void;
  showBcc: boolean;
  onToggleBcc: () => void;
  isLight: boolean;
}

export function EmailRecipientFields({ ... }: EmailRecipientFieldsProps) {
  return (
    <div className="space-y-3">
      {/* To Field */}
      <div className="flex items-center gap-2">
        <label className="w-16 text-sm font-medium">To:</label>
        <input
          type="email"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          placeholder="recipient@example.com"
          className="flex-1 px-3 py-2 rounded-lg border"
        />
        {!showCc && (
          <button onClick={onToggleCc} className="text-sm text-blue-600">
            Cc
          </button>
        )}
        {!showBcc && (
          <button onClick={onToggleBcc} className="text-sm text-blue-600">
            Bcc
          </button>
        )}
      </div>

      {/* Cc Field */}
      {showCc && (
        <div className="flex items-center gap-2">
          <label className="w-16 text-sm font-medium">Cc:</label>
          <input
            type="email"
            value={cc}
            onChange={(e) => onCcChange(e.target.value)}
            placeholder="cc@example.com"
            className="flex-1 px-3 py-2 rounded-lg border"
          />
        </div>
      )}

      {/* Bcc Field */}
      {showBcc && (
        <div className="flex items-center gap-2">
          <label className="w-16 text-sm font-medium">Bcc:</label>
          <input
            type="email"
            value={bcc}
            onChange={(e) => onBccChange(e.target.value)}
            placeholder="bcc@example.com"
            className="flex-1 px-3 py-2 rounded-lg border"
          />
        </div>
      )}
    </div>
  );
}
```

---

### Phase 4: Integration (Day 9-10)

Refactor main ComposePanel to use new architecture.

**New ComposePanel.tsx (~200 lines):**

```typescript
'use client';

import { useState } from 'react';
import { X, Minus, Maximize2, FileText, Zap } from 'lucide-react';
import {
  useEmailDraft,
  useEmailAttachments,
  useEmailSend,
  useRichTextEditor,
  useAIGeneration,
} from './hooks';
import {
  RichTextEditor,
  EditorToolbar,
  EmailRecipientFields,
  EmailTemplateSelector,
  AttachmentList,
  AIEmailGenerator,
  LinkInsertModal,
  SendButton,
} from './components';

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
  replyTo?: Email;
  forwardEmail?: Email;
}

export default function ComposePanel({
  isLight,
  onClose,
  onSend,
  replyTo,
  forwardEmail
}: ComposePanelProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  // Initialize draft with reply/forward data
  const initialTo = replyTo?.from || '';
  const initialSubject = replyTo
    ? `Re: ${replyTo.subject}`
    : forwardEmail
    ? `Fwd: ${forwardEmail.subject}`
    : '';

  const draftHook = useEmailDraft(initialTo, initialSubject);
  const attachmentsHook = useEmailAttachments();
  const editorHook = useRichTextEditor();
  const aiHook = useAIGeneration();

  const sendHook = useEmailSend(() => {
    onSend?.();
    onClose();
  });

  const handleSend = () => {
    const draft = {
      ...draftHook.getDraft(),
      attachments: attachmentsHook.attachments,
    };
    sendHook.sendEmail(draft);
  };

  const handleApplyTemplate = (template: EmailTemplate) => {
    draftHook.applyTemplate(template);
    setShowTemplates(false);
  };

  const handleAIGenerate = async (prompt: string) => {
    const generated = await aiHook.generate(prompt);
    if (generated) {
      draftHook.setMessage(generated);
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg cursor-pointer"
        onClick={() => setIsMinimized(false)}
      >
        <Mail className="w-5 h-5 inline mr-2" />
        New Message
      </div>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Panel */}
      <div
        className={`fixed z-50 rounded-lg shadow-2xl ${
          isMaximized
            ? 'inset-4'
            : 'bottom-4 right-4 w-full max-w-3xl'
        } ${isLight ? 'bg-white' : 'bg-gray-900'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">New Message</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsMinimized(true)}>
              <Minus className="w-4 h-4" />
            </button>
            <button onClick={() => setIsMaximized(!isMaximized)}>
              <Maximize2 className="w-4 h-4" />
            </button>
            <button onClick={onClose}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Recipient Fields */}
          <EmailRecipientFields
            to={draftHook.to}
            onToChange={draftHook.setTo}
            cc={draftHook.cc}
            onCcChange={draftHook.setCc}
            bcc={draftHook.bcc}
            onBccChange={draftHook.setBcc}
            showCc={draftHook.showCc}
            onToggleCc={() => draftHook.setShowCc(!draftHook.showCc)}
            showBcc={draftHook.showBcc}
            onToggleBcc={() => draftHook.setShowBcc(!draftHook.showBcc)}
            isLight={isLight}
          />

          {/* Subject */}
          <input
            type="text"
            value={draftHook.subject}
            onChange={(e) => draftHook.setSubject(e.target.value)}
            placeholder="Subject"
            className="w-full px-3 py-2 rounded-lg border"
          />

          {/* Editor Toolbar */}
          <EditorToolbar
            onBold={editorHook.formatBold}
            onItalic={editorHook.formatItalic}
            onUnderline={editorHook.formatUnderline}
            onAlignLeft={editorHook.formatAlignLeft}
            onAlignCenter={editorHook.formatAlignCenter}
            onAlignRight={editorHook.formatAlignRight}
            onLink={() => editorHook.setShowLinkModal(true)}
            currentFont={editorHook.currentFont}
            onFontChange={editorHook.changeFont}
            currentFontSize={editorHook.currentFontSize}
            onFontSizeChange={editorHook.changeFontSize}
            currentColor={editorHook.currentColor}
            onColorChange={editorHook.changeColor}
            isLight={isLight}
          />

          {/* Rich Text Editor */}
          <RichTextEditor
            content={draftHook.message}
            onChange={draftHook.setMessage}
            editorRef={editorHook.editorRef}
            placeholder="Write your message..."
            isLight={isLight}
          />

          {/* Attachments */}
          <AttachmentList
            attachments={attachmentsHook.attachments}
            onRemove={attachmentsHook.removeFile}
            onAdd={attachmentsHook.triggerFileInput}
            fileInputRef={attachmentsHook.fileInputRef}
            isLight={isLight}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t">
          <div className="flex gap-2">
            <button onClick={() => setShowTemplates(true)}>
              <FileText className="w-4 h-4" />
            </button>
            <button onClick={() => aiHook.setShowModal(true)}>
              <Zap className="w-4 h-4" />
            </button>
          </div>

          <SendButton
            onSend={handleSend}
            sending={sendHook.sending}
            success={sendHook.success}
            error={sendHook.error}
          />
        </div>
      </div>

      {/* Modals */}
      {showTemplates && (
        <EmailTemplateSelector
          onSelect={handleApplyTemplate}
          onClose={() => setShowTemplates(false)}
          isLight={isLight}
        />
      )}

      {editorHook.showLinkModal && (
        <LinkInsertModal
          onInsert={editorHook.insertLink}
          onClose={() => editorHook.setShowLinkModal(false)}
          isLight={isLight}
        />
      )}

      {aiHook.showModal && (
        <AIEmailGenerator
          onGenerate={handleAIGenerate}
          generating={aiHook.generating}
          onClose={() => aiHook.setShowModal(false)}
          isLight={isLight}
        />
      )}
    </>
  );
}
```

**Result:** ~200 lines instead of 730 lines!

---

## Success Metrics

### Before Refactor
- ❌ 730 lines
- ❌ 18 hooks
- ❌ 23+ state variables
- ❌ No reusability
- ❌ Complex initialization

### After Refactor
- ✅ ~200 lines main component
- ✅ 5 custom hooks
- ✅ 3-4 state variables in main
- ✅ **RichTextEditor is reusable!**
- ✅ Clean component composition

---

## Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 1: Types | 1 day | Types & constants |
| Phase 2: Hooks | 2-3 days | 5 custom hooks |
| Phase 3: Components | 3-4 days | UI components |
| Phase 4: Integration | 1-2 days | Refactored main |
| Phase 5: Testing | 2 days | Tests & docs |

**Total:** 9-12 days (2 weeks)

---

## Reusability Win

**RichTextEditor** can now be used in:
- Email composition
- Note editing in ContactViewPanel
- CMS content editing
- Any other rich text needs

This is a huge win for code reuse across the CRM!

// Type definitions for ComposePanel

export {
  ComposeMode,
  PanelState,
  EditorCommand,
  FontSize,
} from './enums';

// Email interface
export interface Email {
  id: string;
  to: string[];
  from: string;
  subject: string;
  html?: string;
  text?: string;
  created_at: string;
}

// Compose panel props
export interface ComposePanelProps {
  isLight: boolean;
  onClose: () => void;
  onSend?: () => void;
  recipientEmail?: string;
  mode?: 'new' | 'reply' | 'replyAll' | 'forward';
  originalEmail?: Email;
  // Legacy props for backward compatibility
  replyTo?: Email;
  forwardEmail?: Email;
}

// Email composition state
export interface EmailComposition {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  message: string;
  attachments: File[];
}

// Editor formatting state
export interface EditorFormatting {
  font: string;
  fontSize: string;
  color: string;
}

// Link modal state
export interface LinkModal {
  isOpen: boolean;
  url: string;
  text: string;
}

// AI generation state
export interface AIGeneration {
  isOpen: boolean;
  prompt: string;
  isGenerating: boolean;
}

// Email template
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  category?: string;
}

// Attachment with metadata
export interface AttachmentWithMeta extends File {
  id?: string;
  uploadProgress?: number;
}

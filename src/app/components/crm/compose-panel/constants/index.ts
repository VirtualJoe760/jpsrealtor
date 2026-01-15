// Constants for ComposePanel

import { FontSize } from '../types';

// Default fonts
export const DEFAULT_FONTS = [
  'Arial',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Helvetica',
];

// Font sizes
export const FONT_SIZES = [
  { label: 'Small', value: FontSize.SMALL },
  { label: 'Normal', value: FontSize.NORMAL },
  { label: 'Large', value: FontSize.LARGE },
  { label: 'Extra Large', value: FontSize.XLARGE },
];

// Default formatting
export const DEFAULT_FORMATTING = {
  font: 'Arial',
  fontSize: FontSize.NORMAL,
  color: '#000000',
};

// Email templates
export const EMAIL_TEMPLATES = [
  {
    id: 'welcome',
    name: 'Welcome Email',
    subject: 'Welcome!',
    content: '<p>Dear [Name],</p><p>Welcome to our community!</p><p>Best regards,<br>[Your Name]</p>',
    category: 'general',
  },
  {
    id: 'followup',
    name: 'Follow-up',
    subject: 'Following up on our conversation',
    content: '<p>Hi [Name],</p><p>I wanted to follow up on our recent conversation...</p><p>Looking forward to hearing from you.</p>',
    category: 'sales',
  },
  {
    id: 'thankyou',
    name: 'Thank You',
    subject: 'Thank you!',
    content: '<p>Dear [Name],</p><p>Thank you for your time and consideration.</p><p>Best regards,<br>[Your Name]</p>',
    category: 'general',
  },
];

// AI prompt suggestions
export const AI_PROMPT_SUGGESTIONS = [
  'Write a professional follow-up email',
  'Compose a friendly introduction',
  'Draft a meeting request',
  'Create a thank you message',
  'Write a project update',
];

// API endpoints
export const COMPOSE_API_ENDPOINTS = {
  sendEmail: '/api/send-email',
  uploadAttachment: '/api/upload-attachment',
  generateAI: '/api/ai/generate-email',
  saveTemplate: '/api/email-templates',
};

// Validation rules
export const VALIDATION = {
  maxAttachmentSize: 25 * 1024 * 1024, // 25MB
  maxAttachments: 10,
  maxSubjectLength: 200,
  maxToRecipients: 50,
};

// Panel dimensions
export const PANEL_DIMENSIONS = {
  normal: {
    width: '600px',
    height: '600px',
  },
  maximized: {
    width: '100%',
    height: '100%',
  },
  minimized: {
    width: '300px',
    height: '60px',
  },
};

// Animation durations
export const ANIMATION_DURATION = {
  panelResize: 200,
  fadeIn: 150,
  fadeOut: 150,
};

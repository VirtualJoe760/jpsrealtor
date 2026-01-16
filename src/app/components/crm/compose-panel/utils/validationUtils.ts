// Validation utility functions for ComposePanel

import { isValidEmail, parseEmailAddresses } from './emailUtils';
import { VALIDATION } from '../constants';

/**
 * Validation result type
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate email composition form
 */
export function validateEmailForm(
  to: string,
  subject: string,
  message: string,
  attachments: File[]
): ValidationResult {
  const errors: string[] = [];

  // Validate recipients
  if (!to.trim()) {
    errors.push('At least one recipient is required');
  } else {
    const toAddresses = parseEmailAddresses(to);
    const invalidAddresses = toAddresses.filter(addr => !isValidEmail(addr));

    if (invalidAddresses.length > 0) {
      errors.push(`Invalid email addresses: ${invalidAddresses.join(', ')}`);
    }

    if (toAddresses.length > VALIDATION.maxToRecipients) {
      errors.push(`Maximum ${VALIDATION.maxToRecipients} recipients allowed`);
    }
  }

  // Validate subject
  if (!subject.trim()) {
    errors.push('Subject is required');
  } else if (subject.length > VALIDATION.maxSubjectLength) {
    errors.push(`Subject must be less than ${VALIDATION.maxSubjectLength} characters`);
  }

  // Validate message (check if has content beyond HTML tags)
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = message;
  const textContent = tempDiv.textContent || tempDiv.innerText || '';

  if (!textContent.trim()) {
    errors.push('Message body is required');
  }

  // Validate attachments
  if (attachments.length > VALIDATION.maxAttachments) {
    errors.push(`Maximum ${VALIDATION.maxAttachments} attachments allowed`);
  }

  const oversizedFiles = attachments.filter(
    file => file.size > VALIDATION.maxAttachmentSize
  );

  if (oversizedFiles.length > 0) {
    const maxSizeMB = VALIDATION.maxAttachmentSize / (1024 * 1024);
    errors.push(
      `Files exceed ${maxSizeMB}MB limit: ${oversizedFiles.map(f => f.name).join(', ')}`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate CC recipients
 */
export function validateCcRecipients(cc: string): ValidationResult {
  const errors: string[] = [];

  if (cc.trim()) {
    const ccAddresses = parseEmailAddresses(cc);
    const invalidAddresses = ccAddresses.filter(addr => !isValidEmail(addr));

    if (invalidAddresses.length > 0) {
      errors.push(`Invalid CC addresses: ${invalidAddresses.join(', ')}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate BCC recipients
 */
export function validateBccRecipients(bcc: string): ValidationResult {
  const errors: string[] = [];

  if (bcc.trim()) {
    const bccAddresses = parseEmailAddresses(bcc);
    const invalidAddresses = bccAddresses.filter(addr => !isValidEmail(addr));

    if (invalidAddresses.length > 0) {
      errors.push(`Invalid BCC addresses: ${invalidAddresses.join(', ')}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate single attachment
 */
export function validateAttachment(file: File): ValidationResult {
  const errors: string[] = [];

  if (file.size > VALIDATION.maxAttachmentSize) {
    const maxSizeMB = VALIDATION.maxAttachmentSize / (1024 * 1024);
    errors.push(`File "${file.name}" exceeds ${maxSizeMB}MB size limit`);
  }

  // You can add file type validation here if needed
  // Example:
  // const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  // if (!allowedTypes.includes(file.type)) {
  //   errors.push(`File type not allowed: ${file.type}`);
  // }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate total attachments size
 */
export function validateTotalAttachmentsSize(attachments: File[]): ValidationResult {
  const errors: string[] = [];

  const totalSize = attachments.reduce((sum, file) => sum + file.size, 0);
  const maxTotalSize = VALIDATION.maxAttachmentSize * VALIDATION.maxAttachments;

  if (totalSize > maxTotalSize) {
    const maxTotalMB = maxTotalSize / (1024 * 1024);
    const currentTotalMB = (totalSize / (1024 * 1024)).toFixed(1);
    errors.push(
      `Total attachments size (${currentTotalMB}MB) exceeds limit of ${maxTotalMB}MB`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate subject line length with warning for very short subjects
 */
export function validateSubjectWithWarning(subject: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!subject.trim()) {
    errors.push('Subject is required');
  } else {
    if (subject.length > VALIDATION.maxSubjectLength) {
      errors.push(`Subject must be less than ${VALIDATION.maxSubjectLength} characters`);
    }

    if (subject.trim().length < 5) {
      warnings.push('Subject is very short. Consider adding more detail.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if email addresses list contains duplicates
 */
export function checkForDuplicateRecipients(
  to: string,
  cc: string,
  bcc: string
): string[] {
  const allAddresses = [
    ...parseEmailAddresses(to),
    ...parseEmailAddresses(cc),
    ...parseEmailAddresses(bcc),
  ].map(addr => addr.toLowerCase().trim());

  const seen = new Set<string>();
  const duplicates = new Set<string>();

  allAddresses.forEach(addr => {
    if (seen.has(addr)) {
      duplicates.add(addr);
    }
    seen.add(addr);
  });

  return Array.from(duplicates);
}

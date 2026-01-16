// useTemplates hook - Manages email templates

import { useState, useCallback } from 'react';
import { EMAIL_TEMPLATES } from '../constants';
import type { EmailTemplate } from '../types';

export function useTemplates() {
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);

  // Get all available templates
  const templates = EMAIL_TEMPLATES;

  // Open template selector
  const openTemplates = useCallback(() => {
    setShowTemplates(true);
  }, []);

  // Close template selector
  const closeTemplates = useCallback(() => {
    setShowTemplates(false);
  }, []);

  // Toggle template selector
  const toggleTemplates = useCallback(() => {
    setShowTemplates(prev => !prev);
  }, []);

  // Select a template
  const selectTemplate = useCallback((template: EmailTemplate) => {
    setSelectedTemplate(template);
    setShowTemplates(false);
  }, []);

  // Clear selected template
  const clearSelectedTemplate = useCallback(() => {
    setSelectedTemplate(null);
  }, []);

  // Get template by id
  const getTemplateById = useCallback((id: string): EmailTemplate | undefined => {
    return EMAIL_TEMPLATES.find(template => template.id === id);
  }, []);

  // Get templates by category
  const getTemplatesByCategory = useCallback((category: string): EmailTemplate[] => {
    return EMAIL_TEMPLATES.filter(template => template.category === category);
  }, []);

  // Apply template content
  const applyTemplate = useCallback((
    template: EmailTemplate,
    onApply: (subject: string, content: string) => void
  ) => {
    onApply(template.subject, template.content);
    setSelectedTemplate(template);
    setShowTemplates(false);
  }, []);

  return {
    templates,
    showTemplates,
    selectedTemplate,
    openTemplates,
    closeTemplates,
    toggleTemplates,
    selectTemplate,
    clearSelectedTemplate,
    getTemplateById,
    getTemplatesByCategory,
    applyTemplate,
  };
}

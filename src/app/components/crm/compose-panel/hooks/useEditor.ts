// useEditor hook - Manages rich text editor state and commands

import { useState, useRef, useCallback, useEffect } from 'react';
import { EditorCommand, FontSize } from '../types';
import { DEFAULT_FORMATTING } from '../constants';
import {
  executeEditorCommand,
  applyFontFamily,
  applyFontSize,
  applyTextColor,
  insertLink,
  focusEditorAtEnd,
  hasEditorContent,
  clearEditorContent,
} from '../utils';

export function useEditor() {
  const editorRef = useRef<HTMLDivElement>(null);
  const [currentFont, setCurrentFont] = useState(DEFAULT_FORMATTING.font);
  const [currentFontSize, setCurrentFontSize] = useState<string>(DEFAULT_FORMATTING.fontSize);
  const [currentColor, setCurrentColor] = useState(DEFAULT_FORMATTING.color);

  // Set initial content if provided
  const setContent = useCallback((html: string) => {
    if (editorRef.current) {
      editorRef.current.innerHTML = html;
    }
  }, []);

  // Get current content
  const getContent = useCallback((): string => {
    return editorRef.current?.innerHTML || '';
  }, []);

  // Execute formatting command
  const formatText = useCallback((command: EditorCommand, value?: string) => {
    executeEditorCommand(command, value);
    editorRef.current?.focus();
  }, []);

  // Apply bold formatting
  const toggleBold = useCallback(() => {
    formatText(EditorCommand.BOLD);
  }, [formatText]);

  // Apply italic formatting
  const toggleItalic = useCallback(() => {
    formatText(EditorCommand.ITALIC);
  }, [formatText]);

  // Apply underline formatting
  const toggleUnderline = useCallback(() => {
    formatText(EditorCommand.UNDERLINE);
  }, [formatText]);

  // Apply text alignment
  const alignLeft = useCallback(() => {
    formatText(EditorCommand.ALIGN_LEFT);
  }, [formatText]);

  const alignCenter = useCallback(() => {
    formatText(EditorCommand.ALIGN_CENTER);
  }, [formatText]);

  const alignRight = useCallback(() => {
    formatText(EditorCommand.ALIGN_RIGHT);
  }, [formatText]);

  // Change font family
  const changeFontFamily = useCallback((font: string) => {
    setCurrentFont(font);
    applyFontFamily(font);
    editorRef.current?.focus();
  }, []);

  // Change font size
  const changeFontSize = useCallback((size: string) => {
    setCurrentFontSize(size);
    applyFontSize(size);
    editorRef.current?.focus();
  }, []);

  // Change text color
  const changeTextColor = useCallback((color: string) => {
    setCurrentColor(color);
    applyTextColor(color);
    editorRef.current?.focus();
  }, []);

  // Insert link
  const handleInsertLink = useCallback((url: string, text?: string) => {
    insertLink(url, text);
    editorRef.current?.focus();
  }, []);

  // Focus editor
  const focusEditor = useCallback(() => {
    if (editorRef.current) {
      focusEditorAtEnd(editorRef.current);
    }
  }, []);

  // Clear editor
  const clearEditor = useCallback(() => {
    if (editorRef.current) {
      clearEditorContent(editorRef.current);
    }
  }, []);

  // Check if editor has content
  const hasContent = useCallback((): boolean => {
    return hasEditorContent(getContent());
  }, [getContent]);

  return {
    editorRef,
    currentFont,
    currentFontSize,
    currentColor,
    setContent,
    getContent,
    formatText,
    toggleBold,
    toggleItalic,
    toggleUnderline,
    alignLeft,
    alignCenter,
    alignRight,
    changeFontFamily,
    changeFontSize,
    changeTextColor,
    handleInsertLink,
    focusEditor,
    clearEditor,
    hasContent,
  };
}

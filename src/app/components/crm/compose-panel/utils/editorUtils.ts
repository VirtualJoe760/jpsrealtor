// Rich text editor utility functions for ComposePanel

import { EditorCommand } from '../types';

/**
 * Execute editor formatting command
 */
export function executeEditorCommand(
  command: EditorCommand,
  value?: string
): void {
  document.execCommand(command, false, value);
}

/**
 * Apply font family to selected text
 */
export function applyFontFamily(fontName: string): void {
  executeEditorCommand(EditorCommand.FONT_NAME, fontName);
}

/**
 * Apply font size to selected text
 */
export function applyFontSize(fontSize: string): void {
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.style.fontSize = fontSize;

    try {
      range.surroundContents(span);
    } catch (e) {
      // If surroundContents fails (e.g., selection spans multiple elements),
      // fall back to insertHTML
      const selectedText = selection.toString();
      const html = `<span style="font-size: ${fontSize}">${selectedText}</span>`;
      executeEditorCommand(EditorCommand.FONT_SIZE, '3');
      document.execCommand('insertHTML', false, html);
    }
  }
}

/**
 * Apply text color to selected text
 */
export function applyTextColor(color: string): void {
  executeEditorCommand(EditorCommand.FORE_COLOR, color);
}

/**
 * Insert link at cursor position or selected text
 */
export function insertLink(url: string, text?: string): void {
  const selection = window.getSelection();
  const selectedText = selection?.toString() || text || url;
  const linkHtml = `<a href="${url}" style="color: #3b82f6; text-decoration: underline;">${selectedText}</a>`;
  document.execCommand('insertHTML', false, linkHtml);
}

/**
 * Insert HTML content at cursor position
 */
export function insertHtmlContent(html: string): void {
  document.execCommand('insertHTML', false, html);
}

/**
 * Get current cursor position in contentEditable element
 */
export function getCursorPosition(element: HTMLElement): number {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return 0;

  const range = selection.getRangeAt(0);
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(element);
  preCaretRange.setEnd(range.endContainer, range.endOffset);

  return preCaretRange.toString().length;
}

/**
 * Set cursor position in contentEditable element
 */
export function setCursorPosition(element: HTMLElement, position: number): void {
  const selection = window.getSelection();
  const range = document.createRange();

  let currentPos = 0;
  let found = false;

  function traverseNodes(node: Node): boolean {
    if (node.nodeType === Node.TEXT_NODE) {
      const textLength = node.textContent?.length || 0;
      if (currentPos + textLength >= position) {
        range.setStart(node, position - currentPos);
        range.collapse(true);
        found = true;
        return true;
      }
      currentPos += textLength;
    } else {
      for (let i = 0; i < node.childNodes.length; i++) {
        if (traverseNodes(node.childNodes[i])) return true;
      }
    }
    return false;
  }

  traverseNodes(element);

  if (found && selection) {
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

/**
 * Get selected text in editor
 */
export function getSelectedText(): string {
  const selection = window.getSelection();
  return selection?.toString() || '';
}

/**
 * Focus editor and move cursor to end
 */
export function focusEditorAtEnd(element: HTMLElement): void {
  element.focus();
  const range = document.createRange();
  const selection = window.getSelection();
  range.selectNodeContents(element);
  range.collapse(false);
  selection?.removeAllRanges();
  selection?.addRange(range);
}

/**
 * Check if editor has content (excluding whitespace and empty tags)
 */
export function hasEditorContent(html: string): boolean {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  const textContent = tempDiv.textContent || tempDiv.innerText || '';
  return textContent.trim().length > 0;
}

/**
 * Clear editor content
 */
export function clearEditorContent(element: HTMLElement): void {
  element.innerHTML = '';
}

/**
 * Insert signature at current cursor position
 */
export function insertSignature(signature: string): void {
  insertHtmlContent(signature);
}

/**
 * Save current selection/range for later restoration
 */
export function saveSelection(): Range | null {
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    return selection.getRangeAt(0);
  }
  return null;
}

/**
 * Restore previously saved selection/range
 */
export function restoreSelection(range: Range): void {
  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

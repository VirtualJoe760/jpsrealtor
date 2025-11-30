import { useState, useCallback, useRef, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { mdxToHtml, htmlToMdx, cleanMDX } from '@/lib/mdx-processor';

/**
 * Layer 3: Editor State Manager
 *
 * Single source of truth for editor state.
 * Prevents race conditions between multiple useEffect hooks.
 * Manages bidirectional MDX ↔ HTML conversion with debouncing.
 */

export interface EditorState {
  mdx: string;
  html: string;
  isDirty: boolean;
  isSyncing: boolean;
  lastSaved: Date | null;
}

export interface UseEditorStateReturn {
  state: EditorState;
  initializeEditor: (editor: Editor) => Promise<void>;
  handleEditorChange: (editor: Editor) => void;
  setMdx: (newMdx: string) => Promise<void>;
  markSaved: () => void;
  resetDirty: () => void;
}

/**
 * Custom hook for managing editor state with MDX conversion
 *
 * @param initialMdx - Initial MDX content
 * @param onMdxChange - Callback when MDX changes (debounced)
 * @returns Editor state and control functions
 */
export function useEditorState(
  initialMdx: string,
  onMdxChange?: (mdx: string) => void
): UseEditorStateReturn {
  const [state, setState] = useState<EditorState>({
    mdx: initialMdx,
    html: '',
    isDirty: false,
    isSyncing: false,
    lastSaved: null,
  });

  const editorRef = useRef<Editor | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onMdxChangeRef = useRef(onMdxChange);

  // Update callback ref when it changes
  useEffect(() => {
    onMdxChangeRef.current = onMdxChange;
  }, [onMdxChange]);

  /**
   * Initialize editor with MDX content
   * Converts MDX to HTML and loads into editor
   */
  const initializeEditor = useCallback(async (editor: Editor) => {
    editorRef.current = editor;

    try {
      // Convert initial MDX to HTML
      const { html, isValid, errors } = await mdxToHtml(state.mdx);

      if (!isValid) {
        console.error('MDX initialization errors:', errors);
        // Still try to set content even if there are errors
      }

      // Set HTML in editor (only if not focused by user yet)
      if (!editor.isFocused) {
        editor.commands.setContent(html);
      }

      setState(prev => ({ ...prev, html }));
    } catch (error) {
      console.error('Failed to initialize editor:', error);
    }
  }, [state.mdx]);

  /**
   * Handle editor content changes
   * Debounced to prevent excessive conversions
   */
  const handleEditorChange = useCallback((editor: Editor) => {
    // Clear existing timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    // Get HTML from editor
    const html = editor.getHTML();

    // Update HTML immediately (for instant feedback)
    setState(prev => ({
      ...prev,
      html,
      isDirty: true,
      isSyncing: true,
    }));

    // Debounce MDX conversion (wait 500ms after user stops typing)
    syncTimeoutRef.current = setTimeout(async () => {
      try {
        const { mdx, isValid, errors } = await htmlToMdx(html);

        if (!isValid) {
          console.error('HTML to MDX conversion errors:', errors);
        }

        const cleaned = cleanMDX(mdx);

        setState(prev => ({
          ...prev,
          mdx: cleaned,
          isSyncing: false,
        }));

        // Call parent onChange callback
        if (onMdxChangeRef.current) {
          onMdxChangeRef.current(cleaned);
        }
      } catch (error) {
        console.error('Failed to convert HTML to MDX:', error);
        setState(prev => ({ ...prev, isSyncing: false }));
      }
    }, 500);
  }, []);

  /**
   * Update MDX directly (e.g., from AI regeneration)
   * Converts to HTML and updates editor
   */
  const setMdx = useCallback(async (newMdx: string) => {
    try {
      const cleaned = cleanMDX(newMdx);
      const { html, isValid, errors } = await mdxToHtml(cleaned);

      if (!isValid) {
        console.error('MDX to HTML conversion errors:', errors);
      }

      // Update editor content (only if not focused by user)
      if (editorRef.current && !editorRef.current.isFocused) {
        editorRef.current.commands.setContent(html);
      }

      setState(prev => ({
        ...prev,
        mdx: cleaned,
        html,
        isDirty: true,
      }));

      // Call parent onChange callback
      if (onMdxChangeRef.current) {
        onMdxChangeRef.current(cleaned);
      }
    } catch (error) {
      console.error('Failed to set MDX:', error);
    }
  }, []);

  /**
   * Mark content as saved
   */
  const markSaved = useCallback(() => {
    setState(prev => ({
      ...prev,
      isDirty: false,
      lastSaved: new Date(),
    }));
  }, []);

  /**
   * Reset dirty flag without changing lastSaved
   */
  const resetDirty = useCallback(() => {
    setState(prev => ({
      ...prev,
      isDirty: false,
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  return {
    state,
    initializeEditor,
    handleEditorChange,
    setMdx,
    markSaved,
    resetDirty,
  };
}

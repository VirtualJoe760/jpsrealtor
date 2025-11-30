// src/app/components/TipTapEditor.tsx
"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Youtube from "@tiptap/extension-youtube";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import { useEffect, useState } from "react";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code as CodeIcon,
  Link as LinkIcon,
  Youtube as YoutubeIcon,
  Image as ImageIcon,
  Undo,
  Redo,
  FileCode,
  Eye,
  Loader2,
} from "lucide-react";
import { useEditorState } from "@/hooks/useEditorState";

/**
 * TipTap Editor Component - REFACTORED
 *
 * Uses new Layer 3 (useEditorState) for state management
 * - No more race conditions
 * - Working toolbar buttons
 * - Proper MDX ↔ HTML conversion
 * - Debounced sync to prevent excessive conversions
 */

interface TipTapEditorProps {
  content: string; // MDX content
  onChange: (content: string) => void; // Returns MDX content
  placeholder?: string;
  isLight: boolean;
}

export default function TipTapEditor({
  content,
  onChange,
  placeholder = "Start writing your article...",
  isLight,
}: TipTapEditorProps) {
  const [viewMode, setViewMode] = useState<"rich" | "mdx">("rich");
  const [mdxInputValue, setMdxInputValue] = useState(content);

  // Use Layer 3: Editor State Manager
  const { state, initializeEditor, handleEditorChange, setMdx } = useEditorState(
    content,
    onChange // Pass onChange callback for debounced MDX updates
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3], // H1, H2, H3
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: isLight
            ? "text-blue-600 hover:text-blue-700 underline"
            : "text-emerald-400 hover:text-emerald-300 underline",
        },
      }),
      Youtube.configure({
        controls: true,
        nocookie: true,
      }),
      Image.configure({
        HTMLAttributes: {
          class: "rounded-xl border max-w-full h-auto",
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    onUpdate: ({ editor }) => {
      handleEditorChange(editor);
    },
    editorProps: {
      attributes: {
        class: isLight
          ? "prose prose-lg max-w-none focus:outline-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-strong:text-gray-900 prose-code:text-blue-600 prose-code:bg-gray-100 prose-blockquote:border-blue-500 prose-blockquote:text-gray-600"
          : "prose prose-invert prose-lg max-w-none focus:outline-none prose-headings:text-white prose-p:text-gray-300 prose-a:text-emerald-400 prose-strong:text-white prose-code:text-emerald-400 prose-code:bg-gray-800 prose-blockquote:border-emerald-500 prose-blockquote:text-gray-400",
      },
    },
  });

  // Initialize editor once when it's ready
  useEffect(() => {
    if (editor) {
      initializeEditor(editor);
    }
  }, [editor, initializeEditor]);

  // Update MDX input value when switching to MDX view
  useEffect(() => {
    if (viewMode === "mdx") {
      setMdxInputValue(state.mdx);
    }
  }, [viewMode, state.mdx]);

  // Handle content prop changes from parent
  useEffect(() => {
    if (content !== state.mdx && !state.isDirty) {
      setMdx(content);
    }
  }, [content]);

  // Toggle between Rich and MDX views
  const toggleView = () => {
    if (viewMode === "rich") {
      setViewMode("mdx");
    } else {
      // Switching back to rich - update MDX if user edited it
      if (mdxInputValue !== state.mdx) {
        setMdx(mdxInputValue);
      }
      setViewMode("rich");
    }
  };

  // Handle MDX textarea changes
  const handleMdxInput = (newMdx: string) => {
    setMdxInputValue(newMdx);
  };

  // Apply MDX changes when user finishes editing (on blur)
  const handleMdxBlur = () => {
    if (mdxInputValue !== state.mdx) {
      setMdx(mdxInputValue);
    }
  };

  // Toolbar button helpers
  const addLink = () => {
    const url = window.prompt("Enter URL:");
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run();
    }
  };

  const addYoutube = () => {
    const url = window.prompt("Enter YouTube URL:");
    if (url) {
      editor?.commands.setYoutubeVideo({ src: url });
    }
  };

  const addImage = () => {
    const url = window.prompt("Enter image URL:");
    if (url) {
      editor?.commands.setImage({ src: url });
    }
  };

  if (!editor) {
    return (
      <div className={`rounded-lg border p-12 text-center ${
        isLight ? "border-gray-300 bg-gray-50" : "border-gray-700 bg-gray-900"
      }`}>
        <Loader2 className={`w-8 h-8 animate-spin mx-auto mb-2 ${
          isLight ? "text-blue-600" : "text-emerald-400"
        }`} />
        <p className={isLight ? "text-gray-600" : "text-gray-400"}>
          Loading editor...
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border ${isLight ? "border-gray-300" : "border-gray-700"}`}>
      {/* Toolbar */}
      <div
        className={`flex flex-wrap items-center gap-1 p-2 border-b ${
          isLight ? "bg-gray-50 border-gray-300" : "bg-gray-800 border-gray-700"
        }`}
      >
        {/* View Mode Toggle */}
        <div className={`flex items-center gap-1 mr-2 px-2 py-1 rounded ${
          isLight ? "bg-gray-200" : "bg-gray-700"
        }`}>
          <button
            onClick={toggleView}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              viewMode === "rich"
                ? isLight
                  ? "bg-blue-100 text-blue-700"
                  : "bg-emerald-600 text-white"
                : isLight
                ? "hover:bg-gray-300 text-gray-700"
                : "hover:bg-gray-600 text-gray-300"
            }`}
            title="Rich Text View"
          >
            <Eye className="w-4 h-4" />
            <span className="text-xs font-medium">Rich</span>
          </button>
          <button
            onClick={toggleView}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              viewMode === "mdx"
                ? isLight
                  ? "bg-blue-100 text-blue-700"
                  : "bg-emerald-600 text-white"
                : isLight
                ? "hover:bg-gray-300 text-gray-700"
                : "hover:bg-gray-600 text-gray-300"
            }`}
            title="MDX Source View"
          >
            <FileCode className="w-4 h-4" />
            <span className="text-xs font-medium">MDX</span>
          </button>
        </div>

        <div className={`w-px h-6 mx-1 ${isLight ? "bg-gray-300" : "bg-gray-600"}`} />

        {/* Rich Text Toolbar (only show in rich mode) */}
        {viewMode === "rich" && (
          <>
        {/* Text Formatting */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded transition-colors ${
            editor.isActive("bold")
              ? isLight
                ? "bg-blue-100 text-blue-700"
                : "bg-emerald-600 text-white"
              : isLight
              ? "hover:bg-gray-200 text-gray-700"
              : "hover:bg-gray-700 text-gray-300"
          }`}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded transition-colors ${
            editor.isActive("italic")
              ? isLight
                ? "bg-blue-100 text-blue-700"
                : "bg-emerald-600 text-white"
              : isLight
              ? "hover:bg-gray-200 text-gray-700"
              : "hover:bg-gray-700 text-gray-300"
          }`}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>

        {/* Divider */}
        <div className={`w-px h-6 mx-1 ${isLight ? "bg-gray-300" : "bg-gray-600"}`} />

        {/* Headings */}
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-2 rounded transition-colors ${
            editor.isActive("heading", { level: 1 })
              ? isLight
                ? "bg-blue-100 text-blue-700"
                : "bg-emerald-600 text-white"
              : isLight
              ? "hover:bg-gray-200 text-gray-700"
              : "hover:bg-gray-700 text-gray-300"
          }`}
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded transition-colors ${
            editor.isActive("heading", { level: 2 })
              ? isLight
                ? "bg-blue-100 text-blue-700"
                : "bg-emerald-600 text-white"
              : isLight
              ? "hover:bg-gray-200 text-gray-700"
              : "hover:bg-gray-700 text-gray-300"
          }`}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-2 rounded transition-colors ${
            editor.isActive("heading", { level: 3 })
              ? isLight
                ? "bg-blue-100 text-blue-700"
                : "bg-emerald-600 text-white"
              : isLight
              ? "hover:bg-gray-200 text-gray-700"
              : "hover:bg-gray-700 text-gray-300"
          }`}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </button>

        {/* Divider */}
        <div className={`w-px h-6 mx-1 ${isLight ? "bg-gray-300" : "bg-gray-600"}`} />

        {/* Lists */}
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded transition-colors ${
            editor.isActive("bulletList")
              ? isLight
                ? "bg-blue-100 text-blue-700"
                : "bg-emerald-600 text-white"
              : isLight
              ? "hover:bg-gray-200 text-gray-700"
              : "hover:bg-gray-700 text-gray-300"
          }`}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded transition-colors ${
            editor.isActive("orderedList")
              ? isLight
                ? "bg-blue-100 text-blue-700"
                : "bg-emerald-600 text-white"
              : isLight
              ? "hover:bg-gray-200 text-gray-700"
              : "hover:bg-gray-700 text-gray-300"
          }`}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        {/* Divider */}
        <div className={`w-px h-6 mx-1 ${isLight ? "bg-gray-300" : "bg-gray-600"}`} />

        {/* Blockquote & Code */}
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded transition-colors ${
            editor.isActive("blockquote")
              ? isLight
                ? "bg-blue-100 text-blue-700"
                : "bg-emerald-600 text-white"
              : isLight
              ? "hover:bg-gray-200 text-gray-700"
              : "hover:bg-gray-700 text-gray-300"
          }`}
          title="Blockquote"
        >
          <Quote className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`p-2 rounded transition-colors ${
            editor.isActive("codeBlock")
              ? isLight
                ? "bg-blue-100 text-blue-700"
                : "bg-emerald-600 text-white"
              : isLight
              ? "hover:bg-gray-200 text-gray-700"
              : "hover:bg-gray-700 text-gray-300"
          }`}
          title="Code Block"
        >
          <CodeIcon className="w-4 h-4" />
        </button>

        {/* Divider */}
        <div className={`w-px h-6 mx-1 ${isLight ? "bg-gray-300" : "bg-gray-600"}`} />

        {/* Media */}
        <button
          onClick={addLink}
          className={`p-2 rounded transition-colors ${
            editor.isActive("link")
              ? isLight
                ? "bg-blue-100 text-blue-700"
                : "bg-emerald-600 text-white"
              : isLight
              ? "hover:bg-gray-200 text-gray-700"
              : "hover:bg-gray-700 text-gray-300"
          }`}
          title="Add Link"
        >
          <LinkIcon className="w-4 h-4" />
        </button>
        <button
          onClick={addYoutube}
          className={`p-2 rounded transition-colors ${
            isLight ? "hover:bg-gray-200 text-gray-700" : "hover:bg-gray-700 text-gray-300"
          }`}
          title="Embed YouTube"
        >
          <YoutubeIcon className="w-4 h-4" />
        </button>
        <button
          onClick={addImage}
          className={`p-2 rounded transition-colors ${
            isLight ? "hover:bg-gray-200 text-gray-700" : "hover:bg-gray-700 text-gray-300"
          }`}
          title="Add Image"
        >
          <ImageIcon className="w-4 h-4" />
        </button>

        {/* Divider */}
        <div className={`w-px h-6 mx-1 ${isLight ? "bg-gray-300" : "bg-gray-600"}`} />

        {/* Undo/Redo */}
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className={`p-2 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
            isLight ? "hover:bg-gray-200 text-gray-700" : "hover:bg-gray-700 text-gray-300"
          }`}
          title="Undo (Ctrl+Z)"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className={`p-2 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
            isLight ? "hover:bg-gray-200 text-gray-700" : "hover:bg-gray-700 text-gray-300"
          }`}
          title="Redo (Ctrl+Y)"
        >
          <Redo className="w-4 h-4" />
        </button>
          </>
        )}

        {/* Status indicator */}
        {state.isSyncing && (
          <>
            <div className={`w-px h-6 mx-1 ${isLight ? "bg-gray-300" : "bg-gray-600"}`} />
            <div className="flex items-center gap-1 px-2 text-xs text-gray-500">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Syncing...</span>
            </div>
          </>
        )}
      </div>

      {/* Editor Content */}
      {viewMode === "rich" ? (
        <div
          className={`p-6 min-h-[500px] max-h-[600px] overflow-y-auto ${
            isLight ? "bg-white" : "bg-gray-900"
          }`}
          style={{ scrollBehavior: 'auto' }}
        >
          <EditorContent editor={editor} />
        </div>
      ) : (
        <div
          className={`p-6 min-h-[500px] max-h-[600px] overflow-y-auto ${
            isLight ? "bg-white" : "bg-gray-900"
          }`}
        >
          <textarea
            value={mdxInputValue}
            onChange={(e) => handleMdxInput(e.target.value)}
            onBlur={handleMdxBlur}
            className={`w-full h-full min-h-[500px] px-4 py-3 font-mono text-sm resize-none focus:outline-none ${
              isLight
                ? "bg-white text-gray-900 placeholder-gray-400"
                : "bg-gray-900 text-gray-100 placeholder-gray-500"
            }`}
            placeholder="Write your article in MDX format..."
            spellCheck={false}
          />
        </div>
      )}
    </div>
  );
}

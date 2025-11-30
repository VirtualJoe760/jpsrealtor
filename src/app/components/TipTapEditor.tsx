// src/app/components/TipTapEditor.tsx
"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Youtube from "@tiptap/extension-youtube";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import { useEffect } from "react";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  Link as LinkIcon,
  Youtube as YoutubeIcon,
  Image as ImageIcon,
  Undo,
  Redo,
} from "lucide-react";

interface TipTapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  isLight: boolean;
}

export default function TipTapEditor({
  content,
  onChange,
  placeholder = "Start writing your article...",
  isLight,
}: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
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
    content,
    onUpdate: ({ editor }) => {
      const markdown = editor.getHTML();
      onChange(markdown);
    },
    editorProps: {
      attributes: {
        class: `prose prose-lg max-w-none focus:outline-none ${
          isLight
            ? `prose-headings:text-gray-900
               prose-p:text-gray-700
               prose-a:text-blue-600
               prose-strong:text-gray-900
               prose-code:text-blue-600 prose-code:bg-gray-100
               prose-blockquote:border-blue-500 prose-blockquote:text-gray-600`
            : `prose-invert
               prose-headings:text-white
               prose-p:text-gray-300
               prose-a:text-emerald-400
               prose-strong:text-white
               prose-code:text-emerald-400 prose-code:bg-gray-800
               prose-blockquote:border-emerald-500 prose-blockquote:text-gray-400`
        }`,
      },
    },
  });

  // Update editor content when prop changes (e.g., from Groq generation)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  const addLink = () => {
    const url = window.prompt("Enter URL:");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const addYoutube = () => {
    const url = window.prompt("Enter YouTube URL:");
    if (url) {
      editor.commands.setYoutubeVideo({ src: url });
    }
  };

  const addImage = () => {
    const url = window.prompt("Enter image URL:");
    if (url) {
      editor.commands.setImage({ src: url });
    }
  };

  return (
    <div className={`rounded-lg border ${isLight ? "border-gray-300" : "border-gray-700"}`}>
      {/* Toolbar */}
      <div
        className={`flex flex-wrap items-center gap-1 p-2 border-b ${
          isLight ? "bg-gray-50 border-gray-300" : "bg-gray-800 border-gray-700"
        }`}
      >
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
          title="Bold"
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
          title="Italic"
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
          <Code className="w-4 h-4" />
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
          className={`p-2 rounded transition-colors disabled:opacity-30 ${
            isLight ? "hover:bg-gray-200 text-gray-700" : "hover:bg-gray-700 text-gray-300"
          }`}
          title="Undo"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className={`p-2 rounded transition-colors disabled:opacity-30 ${
            isLight ? "hover:bg-gray-200 text-gray-700" : "hover:bg-gray-700 text-gray-300"
          }`}
          title="Redo"
        >
          <Redo className="w-4 h-4" />
        </button>
      </div>

      {/* Editor Content */}
      <div
        className={`p-6 min-h-[500px] max-h-[600px] overflow-y-auto ${
          isLight ? "bg-white" : "bg-gray-900"
        }`}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

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
} from "lucide-react";
import { mdxToHtml, htmlToMdx } from "@/lib/mdx-converter";

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
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [isConverting, setIsConverting] = useState(false);
  const [viewMode, setViewMode] = useState<"rich" | "mdx">("rich");
  const [mdxSource, setMdxSource] = useState<string>(content);

  // Convert MDX to HTML when content prop changes
  useEffect(() => {
    const convertMdx = async () => {
      if (!content) {
        setHtmlContent("");
        setMdxSource("");
        return;
      }
      setMdxSource(content);
      setIsConverting(true);
      try {
        const html = await mdxToHtml(content);
        setHtmlContent(html);
      } catch (error) {
        console.error("Error converting MDX to HTML:", error);
        setHtmlContent(content); // Fallback to original content
      } finally {
        setIsConverting(false);
      }
    };
    convertMdx();
  }, [content]);

  const editor = useEditor({
    immediatelyRender: false,
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
    content: htmlContent,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const mdx = htmlToMdx(html);
      setMdxSource(mdx);
      onChange(mdx); // Return MDX to parent
    },
    editorProps: {
      attributes: {
        class: isLight
          ? "prose prose-lg max-w-none focus:outline-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-strong:text-gray-900 prose-code:text-blue-600 prose-code:bg-gray-100 prose-blockquote:border-blue-500 prose-blockquote:text-gray-600"
          : "prose prose-invert prose-lg max-w-none focus:outline-none prose-headings:text-white prose-p:text-gray-300 prose-a:text-emerald-400 prose-strong:text-white prose-code:text-emerald-400 prose-code:bg-gray-800 prose-blockquote:border-emerald-500 prose-blockquote:text-gray-400",
      },
    },
  });

  // Update editor when HTML content changes (from MDX conversion)
  useEffect(() => {
    if (editor && htmlContent && !isConverting && viewMode === "rich") {
      const currentHtml = editor.getHTML();
      // Only update if content is significantly different (avoid cursor position loss)
      if (currentHtml !== htmlContent && !editor.isFocused) {
        editor.commands.setContent(htmlContent);
      }
    }
  }, [htmlContent, editor, isConverting, viewMode]);

  // Handle MDX source code changes
  const handleMdxChange = async (newMdx: string) => {
    setMdxSource(newMdx);
    onChange(newMdx);

    // Convert to HTML for rich text view
    if (newMdx) {
      try {
        const html = await mdxToHtml(newMdx);
        setHtmlContent(html);
        if (editor) {
          editor.commands.setContent(html);
        }
      } catch (error) {
        console.error("Error converting MDX to HTML:", error);
      }
    }
  };

  // Toggle between views
  const toggleView = async () => {
    if (viewMode === "rich") {
      // Switching to MDX view - ensure MDX is up to date
      if (editor) {
        const html = editor.getHTML();
        const mdx = htmlToMdx(html);
        setMdxSource(mdx);
      }
      setViewMode("mdx");
    } else {
      // Switching to rich view - convert MDX to HTML
      if (mdxSource) {
        try {
          const html = await mdxToHtml(mdxSource);
          setHtmlContent(html);
          if (editor) {
            editor.commands.setContent(html);
          }
        } catch (error) {
          console.error("Error converting MDX to HTML:", error);
        }
      }
      setViewMode("rich");
    }
  };

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
            value={mdxSource}
            onChange={(e) => handleMdxChange(e.target.value)}
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

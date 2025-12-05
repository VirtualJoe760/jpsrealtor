'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Type, Palette, Image as ImageIcon, Save } from 'lucide-react';

interface CRMSettingsProps {
  isLight: boolean;
  onClose: () => void;
}

export default function CRMSettings({ isLight, onClose }: CRMSettingsProps) {
  const [signatureHtml, setSignatureHtml] = useState('');
  const [signaturePhoto, setSignaturePhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Rich text editor states
  const [currentFont, setCurrentFont] = useState('Arial');
  const [currentFontSize, setCurrentFontSize] = useState('14px');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [showColorPicker, setShowColorPicker] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing signature on mount
  useEffect(() => {
    fetchSignature();
  }, []);

  const fetchSignature = async () => {
    try {
      const response = await fetch('/api/user/signature');
      const data = await response.json();

      if (response.ok && data.signature) {
        setSignatureHtml(data.signature.html || '');
        setSignaturePhoto(data.signature.photo || null);

        // Set content in editor
        if (editorRef.current && data.signature.html) {
          editorRef.current.innerHTML = data.signature.html;
        }
      }
    } catch (err) {
      console.error('Failed to fetch signature:', err);
    }
  };

  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleFontChange = (font: string) => {
    setCurrentFont(font);
    formatText('fontName', font);
  };

  const handleFontSizeChange = (size: string) => {
    setCurrentFontSize(size);
    formatText('fontSize', '3');
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      span.style.fontSize = size;
      range.surroundContents(span);
    }
  };

  const handleColorChange = (color: string) => {
    setCurrentColor(color);
    formatText('foreColor', color);
    setShowColorPicker(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please upload an image file' });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image size must be less than 2MB' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      setSignaturePhoto(imageUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const html = editorRef.current?.innerHTML || '';

      const response = await fetch('/api/user/signature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html,
          photo: signaturePhoto,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Signature saved successfully!' });
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save signature' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'An error occurred' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Settings Panel */}
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4`}>
        <div
          className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl ${
            isLight ? 'bg-white' : 'bg-gray-800'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`sticky top-0 z-10 flex items-center justify-between p-6 border-b ${
            isLight ? 'bg-white border-slate-200' : 'bg-gray-800 border-gray-700'
          }`}>
            <h2 className={`text-2xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Email Signature Settings
            </h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-all ${
                isLight ? 'hover:bg-slate-100' : 'hover:bg-gray-700'
              }`}
            >
              <X className={`w-5 h-5 ${isLight ? 'text-slate-600' : 'text-gray-400'}`} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Message */}
            {message && (
              <div className={`p-4 rounded-lg ${
                message.type === 'success'
                  ? isLight
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-green-900/20 border border-green-800 text-green-400'
                  : isLight
                    ? 'bg-red-50 border border-red-200 text-red-700'
                    : 'bg-red-900/20 border border-red-800 text-red-400'
              }`}>
                {message.text}
              </div>
            )}

            {/* Signature Photo */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${
                isLight ? 'text-slate-700' : 'text-gray-300'
              }`}>
                Signature Image (optional)
              </label>
              <div className="flex items-center gap-4">
                {signaturePhoto && (
                  <div className={`relative w-32 h-32 rounded-lg overflow-hidden border-2 ${
                    isLight ? 'border-slate-200' : 'border-gray-600'
                  }`}>
                    <img
                      src={signaturePhoto}
                      alt="Signature"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => setSignaturePhoto(null)}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                    isLight
                      ? 'border-slate-300 text-slate-700 hover:bg-slate-50'
                      : 'border-gray-600 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  {signaturePhoto ? 'Change Image' : 'Upload Image'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
              <p className={`text-xs mt-2 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                Recommended: 200x200px or smaller, max 2MB
              </p>
            </div>

            {/* Rich Text Toolbar */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${
                isLight ? 'text-slate-700' : 'text-gray-300'
              }`}>
                Signature Content
              </label>

              {/* Toolbar */}
              <div className={`flex flex-wrap items-center gap-2 p-3 rounded-t-lg border ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-gray-700 border-gray-600'
              }`}>
                {/* Font Family */}
                <select
                  value={currentFont}
                  onChange={(e) => handleFontChange(e.target.value)}
                  className={`px-3 py-1.5 rounded border text-sm ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-700'
                      : 'bg-gray-800 border-gray-600 text-gray-300'
                  }`}
                >
                  <option value="Arial">Arial</option>
                  <option value="Helvetica">Helvetica</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Courier New">Courier New</option>
                  <option value="Verdana">Verdana</option>
                </select>

                {/* Font Size */}
                <select
                  value={currentFontSize}
                  onChange={(e) => handleFontSizeChange(e.target.value)}
                  className={`px-3 py-1.5 rounded border text-sm ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-700'
                      : 'bg-gray-800 border-gray-600 text-gray-300'
                  }`}
                >
                  <option value="10px">10px</option>
                  <option value="12px">12px</option>
                  <option value="14px">14px</option>
                  <option value="16px">16px</option>
                  <option value="18px">18px</option>
                  <option value="20px">20px</option>
                  <option value="24px">24px</option>
                </select>

                <div className="w-px h-6 bg-slate-300" />

                {/* Text Color */}
                <div className="relative">
                  <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors ${
                      isLight ? 'text-slate-700' : 'text-gray-300'
                    }`}
                    title="Text Color"
                  >
                    <Palette className="w-4 h-4" />
                  </button>
                  {showColorPicker && (
                    <div className="absolute top-full left-0 mt-1 z-10">
                      <input
                        ref={colorInputRef}
                        type="color"
                        value={currentColor}
                        onChange={(e) => handleColorChange(e.target.value)}
                        className="w-32 h-10 border-0 rounded cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                <div className="w-px h-6 bg-slate-300" />

                {/* Formatting Buttons */}
                <button
                  onClick={() => formatText('bold')}
                  className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors ${
                    isLight ? 'text-slate-700' : 'text-gray-300'
                  }`}
                  title="Bold"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  onClick={() => formatText('italic')}
                  className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors ${
                    isLight ? 'text-slate-700' : 'text-gray-300'
                  }`}
                  title="Italic"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button
                  onClick={() => formatText('underline')}
                  className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors ${
                    isLight ? 'text-slate-700' : 'text-gray-300'
                  }`}
                  title="Underline"
                >
                  <Underline className="w-4 h-4" />
                </button>

                <div className="w-px h-6 bg-slate-300" />

                {/* Alignment */}
                <button
                  onClick={() => formatText('justifyLeft')}
                  className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors ${
                    isLight ? 'text-slate-700' : 'text-gray-300'
                  }`}
                  title="Align Left"
                >
                  <AlignLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => formatText('justifyCenter')}
                  className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors ${
                    isLight ? 'text-slate-700' : 'text-gray-300'
                  }`}
                  title="Align Center"
                >
                  <AlignCenter className="w-4 h-4" />
                </button>
                <button
                  onClick={() => formatText('justifyRight')}
                  className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors ${
                    isLight ? 'text-slate-700' : 'text-gray-300'
                  }`}
                  title="Align Right"
                >
                  <AlignRight className="w-4 h-4" />
                </button>
              </div>

              {/* Editor */}
              <div
                ref={editorRef}
                contentEditable
                className={`min-h-[200px] p-4 border border-t-0 rounded-b-lg focus:outline-none ${
                  isLight
                    ? 'bg-white border-slate-200 text-slate-900'
                    : 'bg-gray-800 border-gray-600 text-gray-200'
                }`}
                onInput={(e) => {
                  setSignatureHtml(e.currentTarget.innerHTML);
                }}
                style={{ fontFamily: currentFont, fontSize: currentFontSize }}
              />
            </div>

            {/* Preview */}
            {signatureHtml && (
              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  isLight ? 'text-slate-700' : 'text-gray-300'
                }`}>
                  Preview
                </label>
                <div className={`p-4 rounded-lg border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-gray-700 border-gray-600'
                }`}>
                  <div className="flex gap-4">
                    {signaturePhoto && (
                      <img
                        src={signaturePhoto}
                        alt="Signature"
                        className="w-20 h-20 object-cover rounded"
                      />
                    )}
                    <div
                      className={isLight ? 'text-slate-900' : 'text-gray-200'}
                      dangerouslySetInnerHTML={{ __html: signatureHtml }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`sticky bottom-0 flex items-center justify-end gap-3 p-6 border-t ${
            isLight ? 'bg-white border-slate-200' : 'bg-gray-800 border-gray-700'
          }`}>
            <button
              onClick={onClose}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                isLight
                  ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
                isLight
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Signature'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

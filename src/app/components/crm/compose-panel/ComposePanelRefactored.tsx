'use client';

// ComposePanelRefactored - Integrated refactored ComposePanel
// Original: 730 lines, ~18 hooks
// Refactored: ~250 lines, 8 custom hooks

import { Send, X, Minus, Maximize2 } from 'lucide-react';
import { useEffect } from 'react';
import { ComposeMode, type ComposePanelProps } from './types';
import {
  useCompose,
  useEditor,
  useAttachments,
  useTemplates,
  useAI,
  usePanelState,
  useSendEmail,
  useLinkModal,
} from './hooks';
import {
  RichTextToolbar,
  TemplateSelector,
  AIModal,
  LinkModal,
  AttachmentList,
  RecipientFields,
} from './components';
import { PanelState } from './types';

export default function ComposePanelRefactored({
  isLight,
  onClose,
  onSend,
  recipientEmail,
  mode = 'new',
  originalEmail,
  // Legacy props for backward compatibility
  replyTo,
  forwardEmail,
}: ComposePanelProps) {
  // Determine compose mode from legacy props if needed
  const composeMode: ComposeMode = mode === 'new'
    ? ComposeMode.NEW
    : mode === 'reply'
    ? ComposeMode.REPLY
    : mode === 'replyAll'
    ? ComposeMode.REPLY_ALL
    : ComposeMode.FORWARD;

  // Use legacy props if new props not provided
  const emailToUse = originalEmail || replyTo || forwardEmail;

  // Custom hooks
  const {
    composition,
    showCc,
    showBcc,
    setShowCc,
    setShowBcc,
    updateTo,
    updateCc,
    updateBcc,
    updateSubject,
    updateMessage,
    clearComposition,
    applyTemplate: applyTemplateToComposition,
  } = useCompose({
    mode: composeMode,
    originalEmail: emailToUse,
    recipientEmail,
  });

  const {
    editorRef,
    currentFont,
    currentFontSize,
    currentColor,
    setContent,
    getContent,
    toggleBold,
    toggleItalic,
    toggleUnderline,
    alignLeft,
    alignCenter,
    alignRight,
    changeFontFamily,
    changeFontSize,
    changeTextColor,
    handleInsertLink: insertLinkInEditor,
  } = useEditor();

  const {
    attachments,
    uploadErrors,
    removeAttachment,
    handleFileInput,
  } = useAttachments();

  const {
    templates,
    showTemplates,
    toggleTemplates,
    applyTemplate,
  } = useTemplates();

  const {
    showAIModal,
    aiPrompt,
    isGenerating,
    generationError,
    suggestions,
    openAIModal,
    closeAIModal,
    updatePrompt,
    useSuggestion,
    generateEmail,
  } = useAI();

  const {
    panelState,
    isMinimized,
    isMaximized,
    setMinimized,
    setNormal,
    toggleMaximized,
  } = usePanelState();

  const {
    sending,
    error: sendError,
    success,
    sendEmail,
  } = useSendEmail();

  const {
    showLinkModal,
    linkUrl,
    linkText,
    openLinkModal,
    closeLinkModal,
    updateUrl,
    updateText,
    insertLink,
  } = useLinkModal();

  // Sync editor content with composition message
  useEffect(() => {
    if (composition.message) {
      setContent(composition.message);
    }
  }, [composition.message, setContent]);

  // Handle template application
  const handleApplyTemplate = (template: typeof templates[0]) => {
    applyTemplateToComposition(template.subject, template.content);
    applyTemplate(template, (subject, content) => {
      setContent(content);
    });
  };

  // Handle AI generation
  const handleAIGenerate = async () => {
    await generateEmail((content) => {
      setContent(content);
      updateMessage(content);
    });
  };

  // Handle link insertion
  const handleLinkInsert = () => {
    insertLink((url, text) => {
      insertLinkInEditor(url, text);
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Get current editor content
    const currentMessage = getContent();
    const emailData = {
      ...composition,
      message: currentMessage,
      attachments,
    };

    const success = await sendEmail(emailData);

    if (success) {
      onSend?.();
      setTimeout(() => {
        clearComposition();
        onClose();
      }, 1000);
    }
  };

  // Minimized state
  if (isMinimized) {
    return (
      <div
        className={`hidden md:block fixed bottom-0 right-8 z-50 w-96 rounded-t-lg shadow-lg cursor-pointer ${
          isLight ? 'bg-slate-800' : 'bg-gray-900'
        }`}
        onClick={() => setNormal()}
      >
        <div className="px-4 py-3 flex items-center justify-between text-white">
          <span className="text-sm font-medium truncate">
            {mode === 'reply' ? 'Reply' : mode === 'forward' ? 'Forward' : 'New Message'}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="hover:bg-white/10 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Main panel
  const bgClass = isLight ? 'bg-white' : 'bg-gray-800';
  const borderClass = isLight ? 'border-slate-200' : 'border-gray-700';
  const textClass = isLight ? 'text-slate-900' : 'text-gray-100';
  const inputClass = isLight ? 'text-slate-900' : 'text-gray-100';

  return (
    <div
      className={`fixed ${
        isMaximized
          ? 'inset-4 md:inset-8'
          : 'inset-0 md:inset-auto md:bottom-0 md:right-8 md:w-full md:max-w-2xl'
      } z-50 flex flex-col md:rounded-t-xl shadow-2xl ${bgClass}`}
      style={!isMaximized ? { height: '100vh' } : {}}
    >
      <style jsx>{`
        @media (min-width: 768px) {
          div {
            height: 650px !important;
          }
        }
      `}</style>

      {/* Header */}
      <div
        className={`flex items-center justify-between px-4 py-3 md:rounded-t-xl ${
          isLight ? 'bg-slate-800' : 'bg-gray-900'
        }`}
      >
        <h3 className="text-white font-medium text-base sm:text-lg">
          {mode === 'reply' ? 'Reply' : mode === 'forward' ? 'Forward' : 'New Message'}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMinimized()}
            className="hidden md:block hover:bg-white/10 p-2 rounded text-white"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={toggleMaximized}
            className="hidden md:block hover:bg-white/10 p-2 rounded text-white"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="hover:bg-white/10 p-2 rounded text-white">
            <X className="w-5 h-5 md:w-4 md:h-4" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden relative">
        {/* Recipient Fields */}
        <RecipientFields
          isLight={isLight}
          to={composition.to}
          cc={composition.cc}
          bcc={composition.bcc}
          showCc={showCc}
          showBcc={showBcc}
          onToChange={updateTo}
          onCcChange={updateCc}
          onBccChange={updateBcc}
          onShowCc={() => setShowCc(true)}
          onShowBcc={() => setShowBcc(true)}
          onHideCc={() => {
            setShowCc(false);
            updateCc('');
          }}
          onHideBcc={() => {
            setShowBcc(false);
            updateBcc('');
          }}
        />

        {/* Subject Field with Template Button */}
        <div className={`px-4 py-2 border-b ${borderClass}`}>
          <div className="flex items-center gap-2">
            <label className={`text-sm font-medium w-16 ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
              Subject
            </label>
            <input
              type="text"
              value={composition.subject}
              onChange={(e) => updateSubject(e.target.value)}
              className={`flex-1 bg-transparent outline-none text-sm ${inputClass}`}
              placeholder="Subject"
              required
            />
            <TemplateSelector
              isLight={isLight}
              isOpen={showTemplates}
              templates={templates}
              onToggle={toggleTemplates}
              onSelectTemplate={handleApplyTemplate}
            />
          </div>
        </div>

        {/* Rich Text Toolbar */}
        <RichTextToolbar
          isLight={isLight}
          currentFont={currentFont}
          currentFontSize={currentFontSize}
          currentColor={currentColor}
          onFontChange={changeFontFamily}
          onFontSizeChange={changeFontSize}
          onColorChange={changeTextColor}
          onBold={toggleBold}
          onItalic={toggleItalic}
          onUnderline={toggleUnderline}
          onAlignLeft={alignLeft}
          onAlignCenter={alignCenter}
          onAlignRight={alignRight}
          onInsertLink={openLinkModal}
          onAttach={() => document.getElementById('attachment-input')?.click()}
          onAI={openAIModal}
          onSend={handleSubmit}
          sending={sending}
        />

        {/* Hidden file input */}
        <input
          id="attachment-input"
          type="file"
          onChange={handleFileInput}
          multiple
          className="hidden"
        />

        {/* Message Body */}
        <div className="flex-1 px-4 py-3 overflow-y-auto pb-28 sm:pb-3">
          <div
            ref={editorRef}
            contentEditable
            onInput={(e) => updateMessage(e.currentTarget.innerHTML)}
            className={`min-h-full outline-none ${inputClass}`}
            style={{ fontSize: '14px', lineHeight: '1.5', fontFamily: currentFont }}
          />
        </div>

        {/* Attachments */}
        <AttachmentList
          isLight={isLight}
          attachments={attachments}
          onRemove={removeAttachment}
        />

        {/* Upload Errors */}
        {uploadErrors.length > 0 && (
          <div className="px-4 py-2 bg-yellow-50 border-t border-yellow-200 text-yellow-700 text-sm">
            {uploadErrors.join(', ')}
          </div>
        )}

        {/* Error/Success Messages */}
        {sendError && (
          <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-red-700 text-sm">
            {sendError}
          </div>
        )}
        {success && (
          <div className="px-4 py-2 bg-green-50 border-t border-green-200 text-green-700 text-sm">
            Email sent successfully!
          </div>
        )}

        {/* Footer - Desktop */}
        <div
          className={`hidden md:flex items-center justify-between px-4 py-4 border-t flex-shrink-0 ${borderClass} ${bgClass}`}
        >
          <button
            type="submit"
            disabled={sending}
            className={`flex items-center justify-center gap-2 px-6 py-2 rounded-lg font-medium transition-all text-base ${
              sending ? 'opacity-50 cursor-not-allowed' : ''
            } ${isLight ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
          >
            <Send className="w-4 h-4" />
            {sending ? 'Sending...' : 'Send'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`text-sm ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Discard
          </button>
        </div>
      </form>

      {/* AI Generate Modal */}
      <AIModal
        isLight={isLight}
        isOpen={showAIModal}
        prompt={aiPrompt}
        isGenerating={isGenerating}
        error={generationError}
        suggestions={suggestions}
        onClose={closeAIModal}
        onPromptChange={updatePrompt}
        onGenerate={handleAIGenerate}
        onUseSuggestion={useSuggestion}
      />

      {/* Link Insert Modal */}
      <LinkModal
        isLight={isLight}
        isOpen={showLinkModal}
        url={linkUrl}
        text={linkText}
        onClose={closeLinkModal}
        onUrlChange={updateUrl}
        onTextChange={updateText}
        onInsert={handleLinkInsert}
      />
    </div>
  );
}

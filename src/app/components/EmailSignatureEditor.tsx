// src/app/components/EmailSignatureEditor.tsx
// Stub — full implementation pending
"use client";

interface EmailSignatureEditorProps {
  isLight?: boolean;
  initialSignature?: string;
  onSave?: (signature: string) => Promise<void>;
}

export default function EmailSignatureEditor({
  isLight,
  initialSignature,
  onSave,
}: EmailSignatureEditorProps) {
  return (
    <p className={`text-sm ${isLight ? "text-gray-600" : "text-gray-400"}`}>
      Email signature editor coming soon.
    </p>
  );
}

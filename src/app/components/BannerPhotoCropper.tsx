// src/app/components/BannerPhotoCropper.tsx
// Stub — full implementation pending (hero image cropping tool)
"use client";

interface BannerPhotoCropperProps {
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

export default function BannerPhotoCropper({
  imageSrc,
  onCropComplete,
  onCancel,
}: BannerPhotoCropperProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full text-center">
        <p className="text-gray-900 font-medium mb-4">Banner cropper coming soon</p>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium text-gray-700"
        >
          Close
        </button>
      </div>
    </div>
  );
}

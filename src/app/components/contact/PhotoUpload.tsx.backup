"use client";

import { useRef } from "react";

interface PhotoUploadProps {
  onPhotosSelected: (files: FileList | null) => void;
}

export default function PhotoUpload({ onPhotosSelected }: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onPhotosSelected(e.target.files);
  };

  return (
    <div className="sm:col-span-2">
      <label htmlFor="photos" className="block text-sm/6 font-semibold text-white">
        Upload Photos
      </label>
      <input
        id="photos"
        name="photos"
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileChange}
        className="mt-2.5 block w-full rounded-md px-3.5 py-2 text-base text-white outline outline-1 outline-gray-700 focus:outline-indigo-500"
      />
    </div>
  );
}

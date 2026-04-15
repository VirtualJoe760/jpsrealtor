"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, X, Loader2 } from "lucide-react";
import { uploadToCloudinary } from "@/app/utils/cloudinaryUpload";

interface ImageUploadFieldProps {
  label: string;
  value?: string;
  fieldPath: string;
  folder: string;
  helpText?: string;
  isLight: boolean;
  aspectRatio?: string;
  maxSizeMB?: number;
  onUploaded: (url: string) => void;
}

export default function ImageUploadField({
  label,
  value,
  fieldPath,
  folder,
  helpText,
  isLight,
  aspectRatio = "aspect-video",
  maxSizeMB = 5,
  onUploaded,
}: ImageUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File must be under ${maxSizeMB}MB`);
      return;
    }

    setError("");
    setIsUploading(true);

    try {
      const urls = await uploadToCloudinary([file], folder);
      const url = urls[0];

      // Save immediately to profile
      await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [fieldPath.includes(".") ? fieldPath.split(".")[0] : fieldPath]:
            fieldPath.includes(".")
              ? { [fieldPath.split(".").slice(1).join(".")]: url }
              : url,
        }),
      });

      onUploaded(url);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div>
      <label
        className={`block text-sm font-medium mb-2 ${
          isLight ? "text-gray-700" : "text-gray-300"
        }`}
      >
        {label}
      </label>

      <div
        className={`relative rounded-xl border-2 border-dashed overflow-hidden ${
          isLight
            ? "border-gray-300 bg-gray-50"
            : "border-gray-700 bg-gray-800/50"
        } ${aspectRatio}`}
      >
        {value ? (
          <>
            <Image
              src={value}
              alt={label}
              fill
              className="object-contain"
            />
            <button
              onClick={() => onUploaded("")}
              className="absolute top-2 right-2 p-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            {isUploading ? (
              <Loader2
                className={`w-8 h-8 animate-spin ${
                  isLight ? "text-blue-500" : "text-emerald-500"
                }`}
              />
            ) : (
              <>
                <Upload
                  className={`w-8 h-8 ${
                    isLight ? "text-gray-400" : "text-gray-500"
                  }`}
                />
                <span
                  className={`text-sm ${
                    isLight ? "text-gray-500" : "text-gray-400"
                  }`}
                >
                  Click to upload
                </span>
              </>
            )}
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="absolute inset-0 opacity-0 cursor-pointer"
          disabled={isUploading}
        />
      </div>

      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      {helpText && !error && (
        <p
          className={`text-xs mt-1 ${
            isLight ? "text-gray-500" : "text-gray-400"
          }`}
        >
          {helpText}
        </p>
      )}
    </div>
  );
}

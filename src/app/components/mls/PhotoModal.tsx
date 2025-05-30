"use client";

import React from "react";
import Image from "next/image";

type MediaItem = {
  type: "photo" | "video";
  src: string;
  alt?: string;
};

interface PhotoModalProps {
  media: MediaItem;
  onClose: () => void;
}

const PhotoModal: React.FC<PhotoModalProps> = ({ media, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center">
      <button
        className="absolute top-4 right-4 text-white text-2xl"
        onClick={onClose}
      >
        &times;
      </button>

      {media.type === "photo" ? (
        <div className="relative w-[90vw] h-[80vh]">
          <Image
            src={media.src}
            alt={media.alt || "Enlarged Photo"}
            fill
            className="object-contain"
          />
        </div>
      ) : (
        <div className="w-[90vw] h-[80vh] bg-black">
          <iframe
            src={media.src}
            title={media.alt || "Video"}
            className="w-full h-full"
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
};

export default PhotoModal;

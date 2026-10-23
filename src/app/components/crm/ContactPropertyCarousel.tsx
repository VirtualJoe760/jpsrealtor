// src/app/components/crm/ContactPropertyCarousel.tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Home } from "lucide-react";

type PropertyImage = {
  url: string;
  source: string;
  caption: string;
  order: number;
  sourcePage?: string;
};

type Props = {
  contactId: string;
  isLight: boolean;
};

export default function ContactPropertyCarousel({ contactId, isLight }: Props) {
  const [images, setImages] = useState<PropertyImage[]>([]);
  const [current, setCurrent] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [source, setSource] = useState<string>('none');
  const [message, setMessage] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true); setCurrent(0); setImages([]);
    async function load() {
      try {
        const options = { signal: controller.signal, cache: 'no-store' as const };
        let response = await fetch(`/api/crm/contacts/${contactId}/property-images`, options);
        let data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Photo lookup failed');
        if (!data.images?.length || retry > 0) {
          response = await fetch(`/api/crm/contacts/${contactId}/property-images`, { ...options, method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sourceUrl ? { sourceUrl } : {}) });
          data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Photo lookup failed');
        }
        if (!controller.signal.aborted) { setImages(data.images || []); setSource(data.source || 'none'); setMessage(data.message || ''); }
      } catch (error) { if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : 'Photo lookup failed'); }
      finally { if (!controller.signal.aborted) setIsLoading(false); }
    }
    void load(); return () => controller.abort();
  }, [contactId, retry]);

  const next = () => setCurrent((prev) => (prev + 1) % images.length);
  const prev = () =>
    setCurrent((prev) => (prev - 1 + images.length) % images.length);

  const nextIndex = (current + 1) % images.length;

  // Source badge styling
  const getSourceBadgeColor = () => {
    switch (source) {
      case 'active':
        return 'bg-green-600 text-white';
      case 'closed':
        return 'bg-blue-600 text-white';
      case 'comps':
        return 'bg-orange-600 text-white';
      case 'streetview':
        return 'bg-purple-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  return (
    <div
      className={`
        relative
        w-full
        h-full
        overflow-hidden
        ${isLight ? 'bg-gray-200' : 'bg-gray-800'}
      `}
    >
      {isLoading ? (
        <div className={`flex items-center justify-center h-full w-full ${
          isLight ? 'text-gray-600' : 'text-gray-400'
        }`}>
          <div className={`w-6 h-6 border-2 border-t-transparent rounded-full animate-spin ${
            isLight ? 'border-gray-600' : 'border-gray-400'
          }`} />
        </div>
      ) : images.length === 0 ? (
        <div className={`flex flex-col items-center justify-center h-full w-full ${
          isLight ? 'text-gray-500' : 'text-gray-400'
        }`}>
          <p className="px-3 text-center text-xs">{message || 'No property images available'}</p>
          <form className="mt-2 flex w-full gap-2 px-3" onSubmit={event => { event.preventDefault(); setRetry(value => value + 1); }}><input type="url" required aria-label="Property photo source URL" value={sourceUrl} onChange={event => setSourceUrl(event.target.value)} placeholder="Zillow / Redfin / Realtor property URL" className="min-h-11 min-w-0 flex-1 rounded-lg border bg-transparent px-2 text-xs" /><button className="min-h-11 rounded-lg border px-2 text-xs" type="submit">Find photo</button></form>
        </div>
      ) : (
        <>
          {/* Main Photo */}
          <Image
            src={images[current]?.url || "/images/no-photo.png"}
            alt={images[current]?.caption || "Property image"}
            fill
            className="object-cover"
            priority={current === 0}
            loading={current === 0 ? "eager" : "lazy"}
            quality={90}
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 90vw, 1200px"
            unoptimized
            onError={() => { setImages(previous => previous.filter((_, index) => index !== current)); setCurrent(0); setMessage('A photo could not load. Try another source link.'); }}
          />

          {/* Preload Next Photo */}
          {images[nextIndex]?.url && !images[nextIndex]?.url?.includes('streetview') && (
            <Image
              src={images[nextIndex].url}
              alt="Next"
              fill
              className="hidden"
              quality={85}
              loading="lazy"
              unoptimized
            />
          )}

          {/* Source Badge */}
          <div className="absolute top-3 right-3 z-10">
            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg ${getSourceBadgeColor()}`}>
              {images[current]?.source || source}
            </span>
          </div>

          {images[current]?.sourcePage && <a href={images[current].sourcePage} target="_blank" rel="noopener noreferrer" className="absolute bottom-2 right-2 z-20 rounded bg-black/75 px-2 py-1 text-xs text-white">Photo source ↗</a>}
          {/* Navigation - Only show if more than 1 image */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                className="
                  absolute
                  left-3
                  top-1/2
                  -translate-y-1/2
                  bg-black/70
                  hover:bg-black/90
                  backdrop-blur-sm
                  p-2
                  rounded-full
                  z-10
                  transition-all
                  hover:scale-110
                  active:scale-95
                  shadow-lg
                "
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                className="
                  absolute
                  right-3
                  top-1/2
                  -translate-y-1/2
                  bg-black/70
                  hover:bg-black/90
                  backdrop-blur-sm
                  p-2
                  rounded-full
                  z-10
                  transition-all
                  hover:scale-110
                  active:scale-95
                  shadow-lg
                "
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>

              {/* Counter */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full z-10">
                <span className="text-white text-sm font-medium">
                  {current + 1} / {images.length}
                </span>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

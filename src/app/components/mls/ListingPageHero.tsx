"use client"

import React, { useState, useEffect } from "react"
import Image from "next/image"

type MediaItem =
  | { type: "photo"; url: string; thumbnail?: string; caption?: string }
  | { type: "video"; url: string; caption?: string }

interface ListingPageHeroProps {
  media: MediaItem[]
}

const ListingPageHero: React.FC<ListingPageHeroProps> = ({ media }) => {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    media.forEach((item) => {
      if (item.type === "photo") {
        const img = new window.Image()
        img.src = item.thumbnail || item.url
      }
    })
  }, [media])

  const currentItem = media[current]

  if (!media || media.length === 0 || !currentItem) {
    return (
      <div className="w-full h-[400px] bg-gray-200 flex items-center justify-center rounded-xl text-gray-500">
        No media available.
      </div>
    )
  }

  const next = () => setCurrent((prev) => (prev + 1) % media.length)
  const prev = () => setCurrent((prev) => (prev - 1 + media.length) % media.length)

  return (
    <div className="relative w-full max-w-screen mx-auto aspect-[16/9] xl:aspect-[2.2/1] overflow-hidden">
      {/* Media rendering */}
      {currentItem.type === "photo" ? (
        <Image
          src={currentItem.url}
          alt={currentItem.caption || `Photo ${current + 1}`}
          fill
          priority={current === 0}
          placeholder="blur"
          blurDataURL={currentItem.thumbnail || currentItem.url}
          className="object-cover transition-opacity duration-500"
        />
      ) : (
        <div className="w-full h-full relative z-10 bg-black">
          <iframe
            src={currentItem.url}
            className="absolute top-0 left-0 w-full h-full"
            allow="autoplay; fullscreen"
            loading="lazy"
          ></iframe>
        </div>
      )}

      {/* Left hover zone */}
      <div
        className="absolute top-0 left-0 h-full w-[15%] z-20 cursor-pointer group"
        onClick={prev}
      >
        <div className="w-full h-full bg-gradient-to-r from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-6xl xl:text-7xl pointer-events-none z-30">
          ‹
        </div>
      </div>

      {/* Right hover zone */}
      <div
        className="absolute top-0 right-0 h-full w-[15%] z-20 cursor-pointer group"
        onClick={next}
      >
        <div className="w-full h-full bg-gradient-to-l from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-6xl xl:text-7xl pointer-events-none z-30">
          ›
        </div>
      </div>
    </div>
  )
}

export default ListingPageHero

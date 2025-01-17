import React from "react";

interface YouTubeEmbedProps {
  videoId: string;
  title?: string;
  autoplay?: boolean;
}

const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({ videoId, title, autoplay = false }) => {
  const autoplayParam = autoplay ? "?autoplay=1" : "?autoplay=0";
  const fullUrl = `https://www.youtube.com/embed/${videoId}${autoplayParam}&rel=0&playsinline=1`;

  return (
    <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
      <iframe
        src={fullUrl}
        title={title || "YouTube video"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute top-0 left-0 w-full h-full"
      ></iframe>
    </div>
  );
};

export default YouTubeEmbed;

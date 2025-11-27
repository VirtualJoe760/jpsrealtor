// src/components/TidyCalEmbed.tsx
"use client";

import React, { useEffect } from "react";

const TidyCalEmbed: React.FC<{ path: string }> = ({ path }) => {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://asset-tidycal.b-cdn.net/js/embed.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <div className="tidycal-embed" data-path={path}></div>
  );
};

export default TidyCalEmbed;

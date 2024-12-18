"use client";

import React from "react";

const IframeSearch: React.FC = () => {
  return (
    <div className="w-full h-screen">
      <iframe
        src="https://joseph.obsidianregroup.com/search?s[orderBy]=sourceCreationDate%2Cdesc&s[page]=1&s[limit]=18"
        title="Property Search"
        className="w-full h-full border-0"
        allowFullScreen
      ></iframe>
    </div>
  );
};

export default IframeSearch;

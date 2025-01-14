"use client";

import React, { useState } from "react";
import { ClipLoader } from "react-spinners";

const IframeSearch: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true); // State to track iframe loading

  return (
    <div className="w-full h-screen relative">
      {/* Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
          <ClipLoader size={50} color="#ffffff" />
        </div>
      )}

      {/* Iframe */}
      <iframe
        src="https://joseph.obsidianregroup.com/search/map?s[locations][0][city]=Palm%20Springs&s[locations][0][state]=CA&s[locations][1][city]=Palm%20Desert&s[locations][1][state]=CA&s[locations][2][city]=Indio&s[locations][2][state]=CA&s[locations][3][city]=Indian%20Wells&s[locations][3][state]=CA&s[orderBy]=sourceCreationDate%2Cdesc&s[page]=1"
        title="Property Search"
        className="w-full h-full border-0"
        allowFullScreen
        onLoad={() => setIsLoading(false)} // Set isLoading to false once the iframe loads
      ></iframe>
    </div>
  );
};

export default IframeSearch;

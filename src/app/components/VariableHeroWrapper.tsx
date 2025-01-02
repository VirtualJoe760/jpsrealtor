"use client";

import React, { useState, useEffect } from "react";
import VariableHero from "./VariableHero";

const VariableHeroWrapper: React.FC = () => {
  const [backgroundImage, setBackgroundImage] = useState("/joey/home.png");

  useEffect(() => {
    const updateBackgroundImage = () => {
      if (window.innerWidth <= 768) {
        setBackgroundImage("/joey/home-mobile.png");
      } else {
        setBackgroundImage("/joey/home.png");
      }
    };

    // Initial check
    updateBackgroundImage();

    // Recalculate on window resize
    window.addEventListener("resize", updateBackgroundImage);

    return () => {
      window.removeEventListener("resize", updateBackgroundImage);
    };
  }, []);

  return (
    <VariableHero
      backgroundImage={backgroundImage}
      heroContext=" "
      description=""
      alignment="right"
    />
  );
};

export default VariableHeroWrapper;

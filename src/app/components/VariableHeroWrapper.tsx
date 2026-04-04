"use client";

import React, { useState, useEffect } from "react";
import VariableHero from "./VariableHero";

const VariableHeroWrapper: React.FC = () => {
  const [backgroundImage, setBackgroundImage] = useState("https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/joey/home");

  useEffect(() => {
    const updateBackgroundImage = () => {
      if (window.innerWidth <= 768) {
        setBackgroundImage("https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/joey/home-mobile");
      } else {
        setBackgroundImage("https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/joey/home");
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

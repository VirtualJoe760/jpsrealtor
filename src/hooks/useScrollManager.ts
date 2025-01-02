// src/hooks/useScrollManager.ts
import { useEffect, useRef } from "react";

export function useScrollManager() {
  const updateRef = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      updateRef.current = false; // Prevent scroll disruptions
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return updateRef;
}

// src/app/components/chat/TypingAnimation.tsx
// Typewriter animation with fun real estate phrases

"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/app/contexts/ThemeContext";

const PHRASES = [
  "Searching for homes in the MLS...",
  "Finding the best homes...",
  "Levitating to your dream home...",
  "Installing premium backsplash...",
  "Admiring vinyl floors...",
  "Admiring the beautiful views...",
  "Polishing granite countertops...",
  "Opening custom closets...",
  "Checking the walk score...",
  "Touring gourmet kitchens...",
  "Inspecting mountain views...",
  "Testing smart home features...",
];

export default function TypingAnimation() {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentPhrase = PHRASES[currentPhraseIndex];

    if (isTyping && !isDeleting) {
      // Typing forward
      if (displayedText.length < currentPhrase.length) {
        const timeout = setTimeout(() => {
          setDisplayedText(currentPhrase.slice(0, displayedText.length + 1));
        }, 50); // Type speed: 50ms per character
        return () => clearTimeout(timeout);
      } else {
        // Finished typing, pause before deleting
        const timeout = setTimeout(() => {
          setIsDeleting(true);
          setIsTyping(false);
        }, 1500); // Pause at end: 1.5s
        return () => clearTimeout(timeout);
      }
    }

    if (isDeleting && !isTyping) {
      // Backspace effect
      if (displayedText.length > 0) {
        const timeout = setTimeout(() => {
          setDisplayedText(currentPhrase.slice(0, displayedText.length - 1));
        }, 30); // Delete speed: 30ms per character (faster)
        return () => clearTimeout(timeout);
      } else {
        // Finished deleting, move to next phrase
        setIsDeleting(false);
        setIsTyping(true);
        setCurrentPhraseIndex((prev) => (prev + 1) % PHRASES.length);
      }
    }
  }, [displayedText, isTyping, isDeleting, currentPhraseIndex]);

  return (
    <div className="flex items-center gap-2">
      <span className={`font-medium ${
        isLight ? "text-gray-700" : "text-gray-300"
      }`}>
        {displayedText}
      </span>
      <span className={`inline-block w-0.5 h-5 animate-pulse ${
        isLight ? "bg-blue-600" : "bg-emerald-500"
      }`} />
    </div>
  );
}

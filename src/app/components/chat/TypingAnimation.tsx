// src/app/components/chat/TypingAnimation.tsx
// Typewriter animation with fun real estate phrases

"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/app/contexts/ThemeContext";

const MLS_PHRASES = [
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

const CONTACT_IMPORT_PHRASES = [
  "Importing contacts...",
  "Finding new potential clients...",
  "Hanging up open house signs...",
  "Farming the neighborhood...",
  "Building your sphere of influence...",
  "Organizing contact lists...",
  "Preparing marketing materials...",
  "Scheduling door knocking routes...",
  "Printing farming postcards...",
  "Updating CRM database...",
  "Analyzing property ownership data...",
  "Identifying absentee owners...",
];

interface TypingAnimationProps {
  mode?: 'general' | 'contact_import';
}

export default function TypingAnimation({ mode = 'general' }: TypingAnimationProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  // Select phrase set based on mode
  const PHRASES = mode === 'contact_import' ? CONTACT_IMPORT_PHRASES : MLS_PHRASES;

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

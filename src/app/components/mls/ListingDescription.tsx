// src/app/components/mls/ListingDescription.tsx
"use client";

import { useThemeClasses } from "@/app/contexts/ThemeContext";

type ListingDescriptionProps = {
    remarks?: string
  }

  export default function ListingDescription({ remarks }: ListingDescriptionProps) {
    const { textPrimary, textSecondary } = useThemeClasses();

    if (!remarks) return null

    return (
      <div className={`prose max-w-none ${textSecondary} mb-10`}>
        <h2 className={`text-xl ${textPrimary} font-semibold mb-2`}>Property Description</h2>
        <p>{remarks}</p>
      </div>
    )
  }

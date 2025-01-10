"use client";

import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();

  const handleBack = () => {
    // Scroll to top before navigating back
    window.scrollTo(0, 0);

    // Use router.back() to navigate to the previous page
    router.back();
  };

  return (
    <button
      onClick={handleBack}
      className="px-8 py-3 bg-gray-700 text-white text-lg font-semibold rounded-md hover:bg-gray-600 transition-all duration-300"
    >
      Back to Previous Page
    </button>
  );
}

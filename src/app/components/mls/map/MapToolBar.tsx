"use client";

import { useEffect } from "react";
import { PanelRightOpen, X } from "lucide-react";

type Props = {
  isOpen: boolean;
  onToggle: () => void;
};

export default function MapToolbar({ isOpen, onToggle }: Props) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <div className="md:hidden flex items-center justify-between px-4 py-2 bg-zinc-950 border-b border-zinc-800 shadow-sm z-40 fixed top-16 w-full">
      <div className="flex-1 text-center">
        <span className="text-base font-bold text-white">Map View</span>
      </div>
      <button
        onClick={onToggle}
        aria-label={isOpen ? "Close Sidebar" : "Open Sidebar"}
        className="text-white absolute right-4"
      >
        {isOpen ? <X className="w-6 h-6" /> : <PanelRightOpen className="w-6 h-6" />}
      </button>
    </div>
  );
}

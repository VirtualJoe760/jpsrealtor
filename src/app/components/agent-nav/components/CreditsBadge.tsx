"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Coins } from "lucide-react";

interface CreditsBadgeProps {
  isLight: boolean;
}

export function CreditsBadge({ isLight }: CreditsBadgeProps) {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/points?limit=0")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.balance !== undefined) setBalance(data.balance);
      })
      .catch(() => {});
  }, []);

  if (balance === null) return null;

  return (
    <Link
      href="/agent/subscription"
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        isLight
          ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
          : "bg-amber-900/20 text-amber-300 hover:bg-amber-900/30 border border-amber-800/50"
      }`}
      title="Marketing Credits"
    >
      <Coins className="w-4 h-4" />
      <span>{balance.toLocaleString()}</span>
    </Link>
  );
}

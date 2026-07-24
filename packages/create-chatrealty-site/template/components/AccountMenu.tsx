"use client";

// Header account control. Replaces the old floating "Favorites" nav item —
// saved homes belong with the account, not in the top nav. Adapts to mode:
//   unavailable (guest-only) → a plain "♥ Saved" link (favorites on this device)
//   guest (accounts work)    → "♥ Saved" + a "Sign in" button (magic link)
//   signedIn                 → "♥ Saved" + an avatar menu (email · Sign out)

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAccount } from "@/lib/account";
import { useFavorites } from "@/lib/favorites";
import SignInDialog from "./SignInDialog";

export default function AccountMenu() {
  const { status, user, signOut } = useAccount();
  const { favorites } = useFavorites();
  const [dialog, setDialog] = useState(false);
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const count = favorites.length;
  const saved = (
    <Link href="/favorites" className="flex items-center gap-1 hover:text-brand">
      <span aria-hidden>♥</span>
      <span>Saved{count ? ` (${count})` : ""}</span>
    </Link>
  );

  // While the session check is in flight, show just the saved link to avoid a flash.
  if (status === "loading" || status === "unavailable") {
    return <div className="flex items-center gap-5 text-sm font-medium text-gray-600">{saved}</div>;
  }

  if (status === "guest") {
    return (
      <div className="flex items-center gap-5 text-sm font-medium text-gray-600">
        {saved}
        <button onClick={() => setDialog(true)} className="hover:text-brand">
          Sign in
        </button>
        {dialog && <SignInDialog onClose={() => setDialog(false)} />}
      </div>
    );
  }

  // signedIn
  const initial = (user?.name || user?.email || "?").slice(0, 1).toUpperCase();
  return (
    <div className="flex items-center gap-5 text-sm font-medium text-gray-600">
      {saved}
      <div className="relative" ref={ref}>
        <button
          onClick={() => setMenu((m) => !m)}
          aria-label="Account"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-white"
        >
          {initial}
        </button>
        {menu && (
          <div className="absolute right-0 z-40 mt-2 w-56 rounded-lg border border-gray-200 bg-white py-2 shadow-lg">
            <div className="border-b border-gray-100 px-4 py-2">
              <p className="truncate text-sm font-semibold text-gray-900">{user?.name || "Signed in"}</p>
              <p className="truncate text-xs text-gray-500">{user?.email}</p>
            </div>
            <Link href="/favorites" onClick={() => setMenu(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              ♥ Saved homes
            </Link>
            <button
              onClick={() => {
                setMenu(false);
                signOut();
              }}
              className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

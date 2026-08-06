"use client";

// Hamburger navigation — STANDARD on every breakpoint, including desktop.
// The header stays minimal (logo + account + this button); all destination
// links live in the slide-out drawer. Restyle freely in the design step, but
// keep the hamburger pattern — it's a framework standard, not a mobile
// fallback.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string };

export default function HamburgerNav({ items, siteName }: { items: NavItem[]; siteName: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change and on Escape.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="flex h-10 w-10 flex-col items-center justify-center gap-[5px] rounded-lg transition hover:bg-gray-100"
      >
        <span className="h-0.5 w-5 rounded-full bg-gray-800" />
        <span className="h-0.5 w-5 rounded-full bg-gray-800" />
        <span className="h-0.5 w-5 rounded-full bg-gray-800" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Navigation">
          {/* Backdrop */}
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          {/* Drawer */}
          <div className="absolute right-0 top-0 flex h-full w-72 max-w-[85vw] flex-col bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <span className="text-sm font-bold text-gray-900">{siteName}</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-gray-500 transition hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
            <nav className="flex flex-col gap-1 p-3">
              {items.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-lg px-4 py-3 text-sm font-medium transition ${
                    pathname === n.href
                      ? "bg-brand/10 text-brand"
                      : "text-gray-700 hover:bg-gray-50 hover:text-brand"
                  }`}
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}

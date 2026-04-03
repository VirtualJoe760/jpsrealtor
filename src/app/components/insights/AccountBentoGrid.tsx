"use client";

import React from "react";
import Link from "next/link";
import { Heart, Bell, Sparkles, BarChart3, Home, UserPlus } from "lucide-react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

const AccountBentoGrid: React.FC = () => {
  const { currentTheme, textPrimary, textMuted } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  const accentText = isLight ? "text-blue-600" : "text-purple-400";
  const cardBg = isLight ? "bg-white" : "bg-gray-800";
  const outlineClass = isLight ? "outline-black/5" : "outline-white/15";

  return (
    <div className="mb-6 md:mb-8">
      <div className="mx-auto max-w-7xl">
        <h2 className={`text-base/7 font-semibold ${accentText}`}>100% Free — No Strings Attached</h2>
        <p className={`mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-pretty sm:text-4xl ${textPrimary}`}>
          The smarter way to search for homes
        </p>
        <p className={`mt-3 max-w-2xl text-base/7 ${textMuted}`}>
          Unlike Zillow or Realtor.com, we don&apos;t sell your info to random agents. You get a direct line to a local expert, AI tools that actually understand what you want, and a dashboard built around <em>your</em> search — not ads.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:mt-12 lg:grid-cols-6 lg:grid-rows-2">

          {/* Save Favorites — top left, large */}
          <div className="relative lg:col-span-3">
            <div className={`absolute inset-0 rounded-lg ${cardBg} max-lg:rounded-t-[2rem] lg:rounded-tl-[2rem]`} />
            <div className="relative flex h-full flex-col overflow-hidden rounded-[calc(0.5rem+1px)] max-lg:rounded-t-[calc(2rem+1px)] lg:rounded-tl-[calc(2rem+1px)]">
              <div className={`flex items-center justify-center h-52 ${isLight ? "bg-blue-50" : "bg-blue-900/20"}`}>
                <Heart className={`w-20 h-20 ${isLight ? "text-blue-400" : "text-blue-500"}`} strokeWidth={1.5} />
              </div>
              <div className="p-8 pt-4">
                <h3 className={`text-sm/4 font-semibold ${accentText}`}>Favorites</h3>
                <p className={`mt-2 text-lg font-medium tracking-tight ${textPrimary}`}>
                  Save &amp; track the homes you love
                </p>
                <p className={`mt-2 max-w-lg text-sm/6 ${textMuted}`}>
                  No more screenshotting listings or losing tabs. Save any property with one tap, organize your shortlist, and access it from any device. On other platforms, your saves disappear when you close the browser — here, they&apos;re yours forever.
                </p>
              </div>
            </div>
            <div className={`pointer-events-none absolute inset-0 rounded-lg shadow-sm outline ${outlineClass} max-lg:rounded-t-[2rem] lg:rounded-tl-[2rem]`} />
          </div>

          {/* Status Alerts — top right, large */}
          <div className="relative lg:col-span-3">
            <div className={`absolute inset-0 rounded-lg ${cardBg} lg:rounded-tr-[2rem]`} />
            <div className="relative flex h-full flex-col overflow-hidden rounded-[calc(0.5rem+1px)] lg:rounded-tr-[calc(2rem+1px)]">
              <div className={`flex items-center justify-center h-52 ${isLight ? "bg-emerald-50" : "bg-emerald-900/20"}`}>
                <Bell className={`w-20 h-20 ${isLight ? "text-emerald-400" : "text-emerald-500"}`} strokeWidth={1.5} />
              </div>
              <div className="p-8 pt-4">
                <h3 className={`text-sm/4 font-semibold ${accentText}`}>Live Status Updates</h3>
                <p className={`mt-2 text-lg font-medium tracking-tight ${textPrimary}`}>
                  Know before everyone else
                </p>
                <p className={`mt-2 max-w-lg text-sm/6 ${textMuted}`}>
                  Your saved listings are automatically monitored. Price drops, pending offers, back-on-market alerts, and sold notifications land in your dashboard instantly — not hours later like the big portals. In a fast market, minutes matter.
                </p>
              </div>
            </div>
            <div className={`pointer-events-none absolute inset-0 rounded-lg shadow-sm outline ${outlineClass} lg:rounded-tr-[2rem]`} />
          </div>

          {/* AI Chat — bottom left, small */}
          <div className="relative lg:col-span-2">
            <div className={`absolute inset-0 rounded-lg ${cardBg} lg:rounded-bl-[2rem]`} />
            <div className="relative flex h-full flex-col overflow-hidden rounded-[calc(0.5rem+1px)] lg:rounded-bl-[calc(2rem+1px)]">
              <div className={`flex items-center justify-center h-44 ${isLight ? "bg-violet-50" : "bg-violet-900/20"}`}>
                <Sparkles className={`w-16 h-16 ${isLight ? "text-violet-400" : "text-violet-500"}`} strokeWidth={1.5} />
              </div>
              <div className="p-8 pt-4">
                <h3 className={`text-sm/4 font-semibold ${accentText}`}>AI-Powered Search</h3>
                <p className={`mt-2 text-lg font-medium tracking-tight ${textPrimary}`}>
                  Ditch the filters
                </p>
                <p className={`mt-2 max-w-lg text-sm/6 ${textMuted}`}>
                  Say &quot;3 bed near good schools under $600k with a pool&quot; and get real results. No dropdown menus, no 47 checkboxes — just tell us what you want.
                </p>
              </div>
            </div>
            <div className={`pointer-events-none absolute inset-0 rounded-lg shadow-sm outline ${outlineClass} lg:rounded-bl-[2rem]`} />
          </div>

          {/* Market Insights — bottom center, small */}
          <div className="relative lg:col-span-2">
            <div className={`absolute inset-0 rounded-lg ${cardBg}`} />
            <div className="relative flex h-full flex-col overflow-hidden rounded-[calc(0.5rem+1px)]">
              <div className={`flex items-center justify-center h-44 ${isLight ? "bg-amber-50" : "bg-amber-900/20"}`}>
                <BarChart3 className={`w-16 h-16 ${isLight ? "text-amber-400" : "text-amber-500"}`} strokeWidth={1.5} />
              </div>
              <div className="p-8 pt-4">
                <h3 className={`text-sm/4 font-semibold ${accentText}`}>Market Intelligence</h3>
                <p className={`mt-2 text-lg font-medium tracking-tight ${textPrimary}`}>
                  Data, not guesswork
                </p>
                <p className={`mt-2 max-w-lg text-sm/6 ${textMuted}`}>
                  See real-time price trends, days on market, and neighborhood comparisons. Make offers backed by data — not gut feelings.
                </p>
              </div>
            </div>
            <div className={`pointer-events-none absolute inset-0 rounded-lg shadow-sm outline ${outlineClass}`} />
          </div>

          {/* Personal Dashboard — bottom right, small */}
          <div className="relative lg:col-span-2">
            <div className={`absolute inset-0 rounded-lg ${cardBg} max-lg:rounded-b-[2rem] lg:rounded-br-[2rem]`} />
            <div className="relative flex h-full flex-col overflow-hidden rounded-[calc(0.5rem+1px)] max-lg:rounded-b-[calc(2rem+1px)] lg:rounded-br-[calc(2rem+1px)]">
              <div className={`flex items-center justify-center h-44 ${isLight ? "bg-rose-50" : "bg-rose-900/20"}`}>
                <Home className={`w-16 h-16 ${isLight ? "text-rose-400" : "text-rose-500"}`} strokeWidth={1.5} />
              </div>
              <div className="p-8 pt-4">
                <h3 className={`text-sm/4 font-semibold ${accentText}`}>Your Dashboard</h3>
                <p className={`mt-2 text-lg font-medium tracking-tight ${textPrimary}`}>
                  Everything in one place
                </p>
                <p className={`mt-2 max-w-lg text-sm/6 ${textMuted}`}>
                  Favorites, alerts, chat history, and saved searches — all synced. No juggling five apps or re-entering criteria every time you visit.
                </p>
              </div>
            </div>
            <div className={`pointer-events-none absolute inset-0 rounded-lg shadow-sm outline ${outlineClass} max-lg:rounded-b-[2rem] lg:rounded-br-[2rem]`} />
          </div>

        </div>

        {/* CTA */}
        <div className="mt-10 text-center">
          <Link
            href="/auth/signin"
            className={`inline-flex items-center gap-2 rounded-lg px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors ${
              isLight
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-purple-600 hover:bg-purple-700"
            }`}
          >
            <UserPlus className="w-5 h-5" />
            Create Your Free Account
          </Link>
          <p className={`mt-3 text-sm ${textMuted}`}>
            No credit card. No spam. No selling your data to third-party agents.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AccountBentoGrid;

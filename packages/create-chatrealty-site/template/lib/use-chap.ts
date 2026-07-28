"use client";

// CHAP transport — shared by every presentation.
//
// The build guide and DESIGN.md both offer three CHAP presentations as equal
// choices (floating widget · inline panel · full-page search). Only the widget
// used to ship, so the first external build had to hand-write the full-page
// version from scratch — for the flagship feature — and two of the three
// options had no starting point at all, which meant the widget was going to win
// most builds by gravity.
//
// The differences between the three are purely shell: where it sits, how big it
// is, what it looks like empty. The transport, the message state and the result
// cards are identical, so they live here once and each presentation is a thin
// component over this hook.

import { useCallback, useEffect, useRef, useState } from "react";

export type ChapCard = {
  listingKey: string;
  address: string | null;
  city: string | null;
  price: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  thumbUrl: string | null;
  detailUrl: string;
  listAgentName: string | null;
  listOfficeName: string | null;
};

export type ChapMsg = { role: "user" | "assistant"; content: string; listings?: ChapCard[] };

export function useChap() {
  // `null` = still asking the server. Presentations need to tell "off" apart
  // from "not known yet": a floating button may hide during both, but a
  // full-page /search must not flash "chat is off" before the answer lands.
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<ChapMsg[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/chat")
      .then((r) => r.json())
      .then((d) => alive && setEnabled(!!d.enabled))
      .catch(() => alive && setEnabled(false));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [msgs]);

  const send = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || busy) return;
      const next: ChapMsg[] = [...msgs, { role: "user", content: q }];
      setMsgs(next);
      setBusy(true);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })) }),
        });
        const data = await res.json();
        setMsgs((m) => [
          ...m,
          res.ok
            ? { role: "assistant", content: data.reply || "…", listings: data.listings || [] }
            : { role: "assistant", content: "Sorry — I couldn't reach the search service just now." },
        ]);
      } catch {
        setMsgs((m) => [...m, { role: "assistant", content: "Sorry — something went wrong. Try again." }]);
      } finally {
        setBusy(false);
      }
    },
    [busy, msgs]
  );

  return { enabled, busy, msgs, send, scrollRef };
}

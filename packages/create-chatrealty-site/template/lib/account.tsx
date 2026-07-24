"use client";

// End-user account context (client). Talks only to the site's own /api/account
// routes — never to ChatRealty directly. Sign-in methods: Google / Facebook
// (when the agent configured their OAuth apps) and the magic email link
// (zero-setup fallback). No passwords, ever.
//
// status:
//   loading     — checking session on mount
//   unavailable — accounts aren't enabled here (test-data / free) → guest-only;
//                 favorites live in localStorage and the UI says "on this device"
//   guest       — accounts work, nobody signed in → saving homes prompts sign-in
//   signedIn    — an end-user is signed in (user is set)
//
// openSignIn() is exposed so ANY component (heart button, swipe deck) can
// summon the sign-in dialog — the dialog itself renders here, globally.

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { signOut as oauthSignOut } from "next-auth/react";
import SignInDialog from "@/components/SignInDialog";

export type AccountUser = { email: string; name: string | null };
export type AccountStatus = "loading" | "unavailable" | "guest" | "signedIn";

type Ctx = {
  status: AccountStatus;
  user: AccountUser | null;
  /** true once we know accounts are usable (guest or signedIn). */
  accountsEnabled: boolean;
  /** Open the global sign-in dialog (no-op when accounts are unavailable). */
  openSignIn: () => void;
  requestLink: (email: string) => Promise<"sent" | "unavailable" | "error">;
  signOut: () => Promise<void>;
  refresh: () => Promise<"unavailable" | "guest" | "signedIn">;
};

const AccountContext = createContext<Ctx | null>(null);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AccountStatus>("loading");
  const [user, setUser] = useState<AccountUser | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/account/me", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (data?.available === false) {
        setStatus("unavailable");
        setUser(null);
        return "unavailable" as const;
      } else if (data?.user) {
        setUser({ email: data.user.email, name: data.user.name ?? null });
        setStatus("signedIn");
        return "signedIn" as const;
      } else {
        setUser(null);
        setStatus("guest");
        return "guest" as const;
      }
    } catch {
      setStatus("unavailable");
      setUser(null);
      return "unavailable" as const;
    }
  }, []);

  // On mount: check the session; if we're a guest, try the OAuth bridge once —
  // a visitor returning from a Google/Facebook redirect has a NextAuth session
  // but no ChatRealty session yet. The bridge converts one into the other.
  useEffect(() => {
    (async () => {
      const s = await refresh();
      if (s !== "guest") return;
      try {
        const res = await fetch("/api/account/oauth-bridge", { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (data?.ok) {
          await refresh();
          setDialogOpen(false);
        }
      } catch {
        /* no OAuth session — stay guest */
      }
    })();
  }, [refresh]);

  const requestLink = useCallback(
    async (email: string): Promise<"sent" | "unavailable" | "error"> => {
      try {
        const res = await fetch("/api/account/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json().catch(() => ({}));
        if (data?.available === false) {
          setStatus("unavailable");
          return "unavailable";
        }
        return data?.ok ? "sent" : "error";
      } catch {
        return "error";
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/account/signout", { method: "POST" });
      // Also end any NextAuth (Google/Facebook) session so the bridge doesn't
      // silently sign the visitor back in on the next load.
      await oauthSignOut({ redirect: false }).catch(() => {});
    } catch {
      /* ignore */
    }
    setUser(null);
    setStatus("guest");
    // Hard reload so the favorites store drops account mode and reverts to guest
    // (it initializes once per JS context).
    if (typeof window !== "undefined") window.location.assign("/");
  }, []);

  const openSignIn = useCallback(() => {
    setDialogOpen(true);
  }, []);

  return (
    <AccountContext.Provider
      value={{
        status,
        user,
        accountsEnabled: status === "guest" || status === "signedIn",
        openSignIn,
        requestLink,
        signOut,
        refresh,
      }}
    >
      {children}
      {dialogOpen && <SignInDialog onClose={() => setDialogOpen(false)} />}
    </AccountContext.Provider>
  );
}

export function useAccount(): Ctx {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used within <AccountProvider>");
  return ctx;
}

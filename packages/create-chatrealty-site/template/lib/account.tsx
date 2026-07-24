"use client";

// End-user account context (client). Talks only to the site's own /api/account
// routes — never to ChatRealty directly. Magic-link only: there is never a
// password in this flow.
//
// status:
//   loading     — checking session on mount
//   unavailable — accounts aren't enabled here (test-data / free) → guest-only;
//                 favorites live in localStorage and the UI says "on this device"
//   guest       — accounts work, nobody signed in → offer "Sign in"
//   signedIn    — an end-user is signed in (user is set)
// requestLink() drives sending → linkSent for the dialog UX.

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type AccountUser = { email: string; name: string | null };
export type AccountStatus = "loading" | "unavailable" | "guest" | "signedIn";

type Ctx = {
  status: AccountStatus;
  user: AccountUser | null;
  /** true once we know accounts are usable (guest or signedIn). */
  accountsEnabled: boolean;
  requestLink: (email: string) => Promise<"sent" | "unavailable" | "error">;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AccountContext = createContext<Ctx | null>(null);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AccountStatus>("loading");
  const [user, setUser] = useState<AccountUser | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/account/me", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (data?.available === false) {
        setStatus("unavailable");
        setUser(null);
      } else if (data?.user) {
        setUser({ email: data.user.email, name: data.user.name ?? null });
        setStatus("signedIn");
      } else {
        setUser(null);
        setStatus("guest");
      }
    } catch {
      setStatus("unavailable");
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh();
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
    } catch {
      /* ignore */
    }
    setUser(null);
    setStatus("guest");
    // Hard reload so the favorites store drops account mode and reverts to guest
    // (it initializes once per JS context).
    if (typeof window !== "undefined") window.location.assign("/");
  }, []);

  return (
    <AccountContext.Provider
      value={{
        status,
        user,
        accountsEnabled: status === "guest" || status === "signedIn",
        requestLink,
        signOut,
        refresh,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount(): Ctx {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used within <AccountProvider>");
  return ctx;
}

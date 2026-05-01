// src/lib/hooks/useImpersonation.ts
// Client-side hook: detects if an admin is impersonating an agent
// via JWT-based impersonation (/api/auth/impersonate).

"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface ImpersonationState {
  /** True while checking impersonation status */
  loading: boolean;
  /** True if admin is impersonating another user via JWT */
  isImpersonating: boolean;
  /** The subdomain being viewed (if on agent subdomain) */
  subdomain: string | null;
  /** Admin email who is impersonating */
  impersonatedBy: string | null;
  /** Admin name who is impersonating */
  impersonatedByName: string | null;
  /** The target agent's profile (fetched from session) */
  agent: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    brokerageName?: string;
    licenseNumber?: string;
    agentProfile?: any;
    image?: string;
  } | null;
}

/**
 * Extract subdomain from current hostname.
 */
function getSubdomain(): string | null {
  if (typeof window === "undefined") return null;
  const host = window.location.hostname;

  if (host.includes("chatrealty")) {
    const parts = host.split("chatrealty")[0]?.replace(/\.$/, "");
    const sub = parts?.split(".").filter((s) => s && s !== "www").pop();
    return sub || null;
  }

  if (host.endsWith(".localhost")) {
    const sub = host.split(".localhost")[0];
    if (sub && sub !== "www") return sub;
  }

  return null;
}

export function useImpersonation(): ImpersonationState {
  const { data: session, status } = useSession();
  const [state, setState] = useState<ImpersonationState>({
    loading: true,
    isImpersonating: false,
    subdomain: null,
    impersonatedBy: null,
    impersonatedByName: null,
    agent: null,
  });

  useEffect(() => {
    if (status === "loading") return;

    const subdomain = getSubdomain();
    const user = session?.user as any;
    const impersonatedBy = user?.impersonatedBy as string | undefined;

    // JWT-based impersonation: the session IS the agent's data
    if (impersonatedBy && user) {
      // Fetch full profile for the impersonated user
      fetch("/api/user/profile")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          const profile = data?.profile;
          setState({
            loading: false,
            isImpersonating: true,
            subdomain,
            impersonatedBy,
            impersonatedByName: user.impersonatedByName || null,
            agent: profile
              ? {
                  _id: user.id,
                  name: profile.name || user.name,
                  email: profile.email || user.email,
                  phone: profile.phone,
                  brokerageName: profile.brokerageName,
                  licenseNumber: profile.licenseNumber,
                  agentProfile: profile.agentProfile,
                  image: profile.image,
                }
              : {
                  _id: user.id,
                  name: user.name,
                  email: user.email,
                },
          });
        })
        .catch(() => {
          setState({
            loading: false,
            isImpersonating: true,
            subdomain,
            impersonatedBy,
            impersonatedByName: user.impersonatedByName || null,
            agent: { _id: user.id, name: user.name, email: user.email },
          });
        });
      return;
    }

    // Not impersonating
    setState({
      loading: false,
      isImpersonating: false,
      subdomain,
      impersonatedBy: null,
      impersonatedByName: null,
      agent: null,
    });
  }, [session, status]);

  return state;
}

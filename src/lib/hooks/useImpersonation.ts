// src/lib/hooks/useImpersonation.ts
// Client-side hook: detects if an admin is viewing an agent's subdomain
// and provides the target agent's data for impersonation view.

"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface ImpersonationState {
  /** True while checking impersonation status */
  loading: boolean;
  /** True if admin is viewing another agent's subdomain */
  isImpersonating: boolean;
  /** The subdomain being viewed */
  subdomain: string | null;
  /** The target agent's profile (if impersonating) */
  agent: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    brokerageName?: string;
    licenseNumber?: string;
    agentProfile?: any;
  } | null;
}

/**
 * Extract subdomain from current hostname.
 * "johndoe.chatrealty.io" → "johndoe"
 * "localhost" → null
 * "chatrealty.io" → null
 */
function getSubdomain(): string | null {
  if (typeof window === "undefined") return null;
  const host = window.location.hostname;

  if (host.includes("chatrealty")) {
    const parts = host.split("chatrealty")[0]?.replace(/\.$/, "");
    const sub = parts?.split(".").filter((s) => s && s !== "www").pop();
    return sub || null;
  }

  return null;
}

export function useImpersonation(): ImpersonationState {
  const { data: session } = useSession();
  const [state, setState] = useState<ImpersonationState>({
    loading: true,
    isImpersonating: false,
    subdomain: null,
    agent: null,
  });

  useEffect(() => {
    const subdomain = getSubdomain();
    const isAdmin = (session?.user as any)?.isAdmin;

    if (!subdomain || !isAdmin) {
      setState({ loading: false, isImpersonating: false, subdomain, agent: null });
      return;
    }

    // Admin on an agent subdomain — fetch that agent's data
    fetch(`/api/admin/impersonate?subdomain=${encodeURIComponent(subdomain)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.agent) {
          setState({
            loading: false,
            isImpersonating: true,
            subdomain,
            agent: data.agent,
          });
        } else {
          setState({ loading: false, isImpersonating: false, subdomain, agent: null });
        }
      })
      .catch(() => {
        setState({ loading: false, isImpersonating: false, subdomain, agent: null });
      });
  }, [session]);

  return state;
}

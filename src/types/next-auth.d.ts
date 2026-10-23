// src/types/next-auth.d.ts
// Type definitions for NextAuth to include custom user properties

import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";
import { UserRole } from "@/models/user";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string;
      roles: UserRole[];
      isAdmin: boolean;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    roles: UserRole[];
    isAdmin: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    roles: UserRole[];
    isAdmin: boolean;
    // Admin impersonation: set when admin is viewing as another user
    impersonatedBy?: string;  // Admin's email who is impersonating
    impersonatedByName?: string; // Admin's name
    /** The agent's own subdomain — where a signed-in agent works (src/lib/agent-host.ts). */
    agentSubdomain?: string;
    /** Hand-off tokens (/api/auth/transfer, /api/auth/impersonate → /api/auth/receive). */
    transferAuth?: boolean;
    impersonation?: boolean;
    targetUserId?: string;
    /** Bare host a normal hand-off was minted for; receive refuses any other host. */
    handoffHost?: string;
  }
}

// src/lib/auth.ts
// NextAuth configuration with industry-standard JWT sessions

import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import bcrypt from "bcryptjs";
import dbConnect from "./mongoose";
import User from "@/models/User";
import { verifyTurnstile } from "./turnstile";
import { checkRateLimit } from "./rate-limit";
import { getAgentTier } from "./subscription-helpers";

/**
 * Determine the cookie domain for session sharing.
 *
 * Returns undefined — lets the browser scope the cookie to the current
 * hostname. This is necessary because the app serves multiple apex domains
 * (chatrealty.io, jpsrealtor.com, josephsardella.com) and a single
 * hardcoded domain would be rejected by the browser on non-matching hosts.
 *
 * Cross-domain auth is handled by /api/auth/transfer → /api/auth/receive.
 * Subdomain sharing (*.chatrealty.io) is handled by the receive endpoint
 * which sets domain=".chatrealty.io" on its cookie.
 */
function getCookieDomain(): string | undefined {
  return undefined;
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID || "",
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        turnstileToken: { label: "Turnstile Token", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        // Per-email rate limit on failed-or-not signin attempts (10/hr). Prevents
        // credential-stuffing bots from hammering a single account.
        const emailKey = credentials.email.toLowerCase();
        const emailLimit = checkRateLimit(`signin:email:${emailKey}`, { max: 10, windowMs: 60 * 60 * 1000 });
        if (!emailLimit.ok) {
          throw new Error("Too many login attempts. Please try again later.");
        }

        // CAPTCHA verify. NextAuth's authorize doesn't get the raw request, so
        // we can't pull the client IP here cleanly; verifyTurnstile works fine
        // without remoteip — Cloudflare uses the token alone for validation.
        const captcha = await verifyTurnstile(credentials.turnstileToken);
        if (!captcha.success) {
          throw new Error("CAPTCHA verification failed. Please try again.");
        }

        await dbConnect();

        const user = await User.findOne({ email: emailKey });

        if (!user || !user.password) {
          throw new Error("Invalid credentials");
        }

        const isCorrectPassword = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isCorrectPassword) {
          throw new Error("Invalid credentials");
        }

        // Check if email is verified
        if (!user.emailVerified) {
          throw new Error("Please verify your email before logging in");
        }

        // Check if 2FA is enabled
        if (user.twoFactorEnabled) {
          // Return special indicator for 2FA requirement
          // Don't log them in yet - they need to verify 2FA code
          return {
            id: String(user._id),
            email: user.email,
            name: user.name,
            image: user.image,
            roles: user.roles,
            isAdmin: user.isAdmin,
            twoFactorEnabled: true,
            requiresTwoFactor: true, // Special flag
          };
        }

        // Update last login
        user.lastLoginAt = new Date();
        await user.save();

        return {
          id: String(user._id),
          email: user.email,
          name: user.name,
          image: user.image,
          roles: user.roles,
          isAdmin: user.isAdmin,
          twoFactorEnabled: false,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // For OAuth providers (Google, Facebook)
      if (account?.provider === "google" || account?.provider === "facebook") {
        await dbConnect();

        // Check if user exists
        let existingUser = await User.findOne({ email: user.email?.toLowerCase() });

        if (!existingUser) {
          // Create new user for OAuth sign-in
          existingUser = await User.create({
            email: user.email?.toLowerCase(),
            name: user.name,
            image: user.image,
            emailVerified: new Date(), // OAuth users are pre-verified
            password: "", // No password for OAuth users
            roles: ["endUser"],
            isAdmin: false,
            lastLoginAt: new Date(),
            signupOrigin: {
              domain: "unknown", // OAuth callbacks don't have request context; backfilled on first page load
              method: account.provider, // "google" or "facebook"
            },
          });

          // Link to agent if signed up on agent domain (non-blocking)
          // Note: OAuth callback has limited origin data but agentId may be set
          const { linkUserToAgent } = await import("@/lib/signup-origin");
          const origin = existingUser.signupOrigin
            ? { ...existingUser.signupOrigin, agentId: existingUser.signupOrigin.agentId?.toString() }
            : { domain: "unknown", method: account.provider };
          linkUserToAgent(existingUser._id.toString(), existingUser.name, existingUser.email, undefined, origin).catch(() => {});
        } else {
          // Update existing user's info and last login
          existingUser.name = user.name || existingUser.name;
          existingUser.image = user.image || existingUser.image;
          existingUser.emailVerified = existingUser.emailVerified || new Date();
          existingUser.lastLoginAt = new Date();
          await existingUser.save();
        }

        return true;
      }

      // For credentials provider, let the default behavior handle it
      return true;
    },
    async jwt({ token, user, account, trigger }) {
      // Initial sign in
      if (account && user) {
        await dbConnect();
        const dbUser = await User.findOne({ email: user.email?.toLowerCase() });

        if (dbUser) {
          token.id = String(dbUser._id);
          token.roles = dbUser.roles;
          token.isAdmin = dbUser.isAdmin;
          token.twoFactorEnabled = dbUser.twoFactorEnabled || false;
          token.requiresTwoFactor = (user as any).requiresTwoFactor || false;
          // Agent tier + onboarding gate (see subscription-helpers.ts + proxy.ts).
          token.onboardingComplete = !!(dbUser as any).agentProfile?.onboardingComplete;
          token.agentTier = await getAgentTier(String(dbUser._id));
        }
      }

      // Refresh agent tier, onboarding status, and roles when the client calls
      // session.update() — e.g. after finishing the setup wizard or changing
      // plan — so the middleware gate + nav gating see fresh values without a
      // full re-login.
      if (trigger === "update" && token.id) {
        await dbConnect();
        const dbUser = await User.findById(token.id as string);
        if (dbUser) {
          token.roles = dbUser.roles;
          token.isAdmin = dbUser.isAdmin;
          token.onboardingComplete = !!(dbUser as any).agentProfile?.onboardingComplete;
          token.agentTier = await getAgentTier(String(dbUser._id));
        }
      }

      // Return previous token if the above didn't run
      if (user && !token.id) {
        token.id = user.id;
        token.roles = (user as any).roles;
        token.isAdmin = (user as any).isAdmin;
        token.twoFactorEnabled = (user as any).twoFactorEnabled;
        token.requiresTwoFactor = (user as any).requiresTwoFactor;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).roles = token.roles;
        (session.user as any).isAdmin = token.isAdmin;
        (session.user as any).twoFactorEnabled = token.twoFactorEnabled;
        (session.user as any).requiresTwoFactor = token.requiresTwoFactor;
        (session.user as any).agentTier = token.agentTier ?? "free";
        (session.user as any).onboardingComplete = !!token.onboardingComplete;
        // Admin impersonation
        if (token.impersonatedBy) {
          (session.user as any).impersonatedBy = token.impersonatedBy;
          (session.user as any).impersonatedByName = token.impersonatedByName;
        }
      }

      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    // Safety net: anywhere in the codebase still calling next-auth/react's
    // signOut() without our signOutChain() wrapper will, after the local
    // cookie clear, land here. The page auto-redirects to jpsrealtor.com after
    // 5s with a button to chatrealty.io. The user's session on OTHER apexes
    // will still be intact in this fallback path — only the wrapper actually
    // chains. Find and migrate any straggler signOut() calls when you spot
    // them in logs.
    signOut: "/auth/signed-out",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // Update session every 24 hours
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        // Domain must be set to share cookies across subdomains:
        //   Dev: .localhost → works for bethanyklier.localhost, etc.
        //   Prod: .chatrealty.io → works for *.chatrealty.io subdomains
        // For non-chatrealty domains (jpsrealtor.com, josephsardella.com),
        // cookies are set without domain so they scope to the exact hostname.
        domain: getCookieDomain(),
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development', // Only debug in dev
  logger: {
    error(code, ...message) {
      // Suppress CLIENT_FETCH_ERROR during dev hot reload
      if (code === 'CLIENT_FETCH_ERROR' && process.env.NODE_ENV === 'development') {
        console.log('[NextAuth] Client fetch error (likely hot reload) - ignoring');
        return;
      }
      console.error('[NextAuth Error]', code, ...message);
    },
    warn(code, ...message) {
      console.warn('[NextAuth Warning]', code, ...message);
    },
    debug(code, ...message) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[NextAuth Debug]', code, ...message);
      }
    }
  },
};

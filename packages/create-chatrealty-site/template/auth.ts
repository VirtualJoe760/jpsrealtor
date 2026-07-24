// NextAuth v5 (Auth.js) — JWT mode, no database. Handles IDENTITY only:
// Google / Facebook sign-in with the AGENT'S OWN OAuth apps. After a
// successful sign-in, /api/account/oauth-bridge exchanges the verified
// identity with ChatRealty for the end-user session cookie — the same
// session the magic-link flow issues — so favorites sync and the CRM lead
// loop are identical for every sign-in method.
//
// Providers appear automatically when their env keys exist (Auth.js v5
// convention): AUTH_GOOGLE_ID + AUTH_GOOGLE_SECRET, AUTH_FACEBOOK_ID +
// AUTH_FACEBOOK_SECRET. AUTH_SECRET is written by the scaffolder. With no
// provider keys set, social buttons hide and magic-link remains the
// zero-setup path.

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";

const providers = [];
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(Google);
}
if (process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET) {
  providers.push(Facebook);
}

export const authProviders = {
  google: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
  facebook: Boolean(process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET),
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  trustHost: true,
});

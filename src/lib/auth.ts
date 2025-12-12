// src/lib/auth.ts
// NextAuth configuration with industry-standard JWT sessions

import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import bcrypt from "bcryptjs";
import dbConnect from "./mongoose";
import User from "@/models/user";

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
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        await dbConnect();

        const user = await User.findOne({ email: credentials.email.toLowerCase() });

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
      console.log("🔐 SignIn Callback:", {
        provider: account?.provider,
        userEmail: user.email,
        userId: user.id
      });

      // For OAuth providers (Google, Facebook)
      if (account?.provider === "google" || account?.provider === "facebook") {
        await dbConnect();

        // Check if user exists
        let existingUser = await User.findOne({ email: user.email?.toLowerCase() });

        if (!existingUser) {
          console.log("✅ Creating new OAuth user:", user.email);
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
          });
        } else {
          console.log("✅ Updating existing OAuth user:", user.email);
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
      console.log("✅ Credentials sign in successful for:", user.email);
      return true;
    },
    async jwt({ token, user, account }) {
      console.log("🎫 JWT Callback:", {
        hasAccount: !!account,
        hasUser: !!user,
        tokenEmail: token.email,
        tokenId: token.id
      });

      // Initial sign in
      if (account && user) {
        console.log("🔄 Initial sign in - fetching user from DB");
        await dbConnect();
        const dbUser = await User.findOne({ email: user.email?.toLowerCase() });

        if (dbUser) {
          console.log("✅ Found user in DB:", dbUser.email);
          token.id = String(dbUser._id);
          token.roles = dbUser.roles;
          token.isAdmin = dbUser.isAdmin;
          token.twoFactorEnabled = dbUser.twoFactorEnabled || false;
          token.requiresTwoFactor = (user as any).requiresTwoFactor || false;
        } else {
          console.log("❌ User not found in DB:", user.email);
        }
      }

      // Return previous token if the above didn't run
      if (user && !token.id) {
        console.log("⚠️ Token missing ID, using user data");
        token.id = user.id;
        token.roles = (user as any).roles;
        token.isAdmin = (user as any).isAdmin;
        token.twoFactorEnabled = (user as any).twoFactorEnabled;
        token.requiresTwoFactor = (user as any).requiresTwoFactor;
      }

      console.log("✅ JWT token created:", {
        id: token.id,
        email: token.email,
        roles: token.roles,
        isAdmin: token.isAdmin
      });

      return token;
    },
    async session({ session, token }) {
      console.log("📦 Session Callback:", {
        hasSession: !!session,
        hasUser: !!session?.user,
        tokenId: token.id,
        tokenEmail: token.email
      });

      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).roles = token.roles;
        (session.user as any).isAdmin = token.isAdmin;
        (session.user as any).twoFactorEnabled = token.twoFactorEnabled;
        (session.user as any).requiresTwoFactor = token.requiresTwoFactor;

        console.log("✅ Session created for user:", {
          email: session.user.email,
          id: token.id,
          roles: token.roles,
          isAdmin: token.isAdmin
        });
      }

      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // Update session every 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true, // Enable debug logging temporarily
};

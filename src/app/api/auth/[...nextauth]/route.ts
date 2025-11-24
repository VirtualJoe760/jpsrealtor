// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

// Export authOptions for use in other API routes
export { authOptions };
export { handler as GET, handler as POST };

// src/types/next-auth.d.ts
import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    name: string;
    email: string;
    role?: string; // Optional role field for users
  }

  interface Session {
    user: User;
  }
}

import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import UserModel from "@/models/User"; // Import your User model
import dbConnect from "@/utils/dbConnect";

// Define NextAuth options
export const authOptions: AuthOptions = {
  secret: process.env.JWT_SECRET, // Ensure JWT_SECRET is set in .env.local
  session: {
    strategy: "jwt", // Use JWT for session management
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Validate that credentials are provided
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password must be provided.");
        }

        const { email, password } = credentials;

        // Connect to the database
        await dbConnect();

        // Find the user by email
        const user = await UserModel.findOne({ email });
        if (!user) {
          throw new Error("Invalid email or password.");
        }

        // Validate the password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          throw new Error("Invalid email or password.");
        }

        // Return the user object for the session
        return {
          id: user._id.toString(), // Convert MongoDB ObjectId to a string
          email: user.email,
          name: user.name || "Anonymous",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Add user info to the JWT token
      if (user) {
        token.id = user.id as string;
        token.email = user.email || "";
        token.name = user.name || "Anonymous";
      }
      return token;
    },
    async session({ session, token }) {
      // Attach token data to the session
      if (token) {
        session.user = {
          id: (token.id as string) || "",
          email: (token.email as string) || "",
          name: (token.name as string) || "Anonymous",
        };
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

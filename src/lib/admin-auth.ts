import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

const ADMIN_EMAILS = ["josephsardella@gmail.com"];

export async function verifyAdmin(): Promise<{ authorized: boolean; email?: string; userId?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { authorized: false };

  // Hardcoded admin emails as fallback
  if (ADMIN_EMAILS.includes(session.user.email)) {
    return { authorized: true, email: session.user.email };
  }

  // Check DB role
  await dbConnect();
  const user = await User.findOne({ email: session.user.email }).select("_id roles").lean();
  if (user?.roles?.includes("admin")) {
    return { authorized: true, email: session.user.email, userId: (user._id as any).toString() };
  }

  return { authorized: false };
}

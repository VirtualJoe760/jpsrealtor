import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dbConnect from "@/utils/dbConnect";
import User from "@/app/models/User"; // Ensure this model exists

export async function POST(req: Request) {
  try {
    // Parse request body
    const body = await req.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
    }

    // Connect to the database
    await dbConnect();

    // Find the user in the database
    const user = await User.findOne({ email });

    // If user does not exist
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Compare the provided password with the stored hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Generate a JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET as string, // Ensure this is defined in .env.local
      { expiresIn: "1h" }
    );

    // Return the token
    return NextResponse.json({ token }, { status: 200 });
  } catch (error) {
    console.error("Error in sign-in API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
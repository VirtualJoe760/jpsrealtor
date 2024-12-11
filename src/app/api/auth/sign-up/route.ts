// src\app\api\user\sign-up\route.ts


import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import dbConnect from "@/utils/dbConnect";
import User from "@/models/User";

export async function POST(request: Request) {
  try {
    // Connect to the database
    await dbConnect();

    // Parse the incoming request body
    const body = await request.json();
    const {
      name,
      email,
      password,
      role,
      subtype,
      isForeignNational,
      brokerName,
      licenseNumber,
      interests,
    } = body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { success: false, message: "Missing required fields." },
        { status: 400 }
      );
    }

    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "User already exists." },
        { status: 400 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
      subtype,
      isForeignNational,
      brokerName,
      licenseNumber,
      interests,
    });

    await newUser.save();

    // Return success response
    return NextResponse.json(
      { success: true, message: "User registered successfully." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error during user registration:", error);
    return NextResponse.json(
      { success: false, message: "An error occurred. Please try again later." },
      { status: 500 }
    );
  }
}

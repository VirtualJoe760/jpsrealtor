import User from "@/app/models/User";
import bcrypt from "bcrypt";

export async function getUserFromDatabase(email: string) {
  const user = await User.findOne({ email });
  return user;
}

export async function verifyPassword(inputPassword: string, hashedPassword: string) {
  return await bcrypt.compare(inputPassword, hashedPassword);
}

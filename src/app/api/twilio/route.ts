import { NextApiRequest, NextApiResponse } from "next";
import { Twilio } from "twilio";

// Load environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID as string;
const authToken = process.env.TWILIO_AUTH_TOKEN as string;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER as string;

// Initialize Twilio client
const client = new Twilio(accountSid, authToken);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({ success: false, error: "Missing 'to' or 'message' fields." });
  }

  try {
    const sms = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to,
    });

    return res.status(200).json({ success: true, sms });
  } catch (error: any) {
    console.error("Failed to send SMS:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

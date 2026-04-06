// src/app/api/leads/sell-intake/route.ts
//
// Handles the "Sell Your Home" intake form on /neighborhoods/[cityId]/sell.
// - Creates a Contact under the primary agent (source: website, tagged "Web Generated Leads" + "Sell Intake")
// - Emails the agent with seller details
// - Optionally creates a User account and sends a password-set email
//
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import nodemailer from "nodemailer";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import Contact from "@/models/Contact";
import { sendPasswordResetEmail } from "@/lib/email-resend";

export const dynamic = "force-dynamic";

const AGENT_EMAIL =
  process.env.PRIMARY_AGENT_EMAIL || "josephsardella@gmail.com";

interface SellIntakeBody {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  cityName?: string;
  cityId?: string;
  address?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  condition?: string;
  timeframe?: string;
  reason?: string;
  expectedPrice?: number;
  message?: string;
  createAccount?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SellIntakeBody;
    const {
      firstName,
      lastName = "",
      email,
      phone,
      cityName,
      cityId,
      address,
      beds,
      baths,
      sqft,
      condition,
      timeframe,
      reason,
      expectedPrice,
      message,
      createAccount,
    } = body;

    if (!firstName || !email) {
      return NextResponse.json(
        { error: "First name and email are required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const agentUser = await User.findOne({ email: AGENT_EMAIL.toLowerCase() });
    if (!agentUser) {
      console.error("[sell-intake] Primary agent user not found:", AGENT_EMAIL);
      return NextResponse.json(
        { error: "Lead intake misconfigured" },
        { status: 500 }
      );
    }

    const forwarded = request.headers.get("x-forwarded-for");
    const ipAddress =
      (forwarded ? forwarded.split(",")[0] : request.headers.get("x-real-ip")) ||
      "unknown";

    // ---- 1. Create / upsert Contact -----------------------------------------
    const existingContact = await Contact.findOne({
      userId: agentUser._id,
      "emails.address": email.toLowerCase(),
    });

    // Build a free-form note that captures all the seller-specific details
    const noteLines = [
      address ? `Property: ${address}` : null,
      beds || baths || sqft
        ? `Specs: ${beds ?? "?"}bd / ${baths ?? "?"}ba / ${sqft ? sqft.toLocaleString() + " sqft" : "? sqft"}`
        : null,
      condition ? `Condition: ${condition}` : null,
      reason ? `Reason: ${reason}` : null,
      expectedPrice ? `Expected price: $${expectedPrice.toLocaleString()}` : null,
      message ? `Notes: ${message}` : null,
    ].filter(Boolean);

    const contactPayload: any = {
      userId: agentUser._id,
      firstName,
      lastName,
      emails: [
        {
          address: email.toLowerCase(),
          label: "personal",
          isPrimary: true,
          isValid: true,
        },
      ],
      phones: phone
        ? [
            {
              number: phone,
              label: "mobile",
              isPrimary: true,
              isValid: true,
            },
          ]
        : [],
      address: address ? { street: address, city: cityName } : undefined,
      source: "website",
      status: "uncontacted",
      tags: ["Web Generated Leads", "Sell Intake", cityName].filter(
        Boolean
      ) as string[],
      interests: {
        selling: true,
        locations: cityName ? [cityName] : [],
        timeframe: timeframe || undefined,
      },
      preferences: {
        emailOptIn: true,
        preferredContactMethod: "email",
      },
      consent: {
        marketingConsent: true,
        consentDate: new Date(),
        consentIp: ipAddress,
      },
      notes: noteLines.join("\n") || undefined,
    };

    if (existingContact) {
      Object.assign(existingContact, contactPayload);
      await existingContact.save();
    } else {
      await Contact.create(contactPayload);
    }

    // ---- 2. Notify the agent via email --------------------------------------
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const html = `
        <h2>New Sell-Page Lead${cityName ? ` — ${cityName}` : ""}</h2>
        <p><strong>Source:</strong> Web Generated Leads (Sell Intake)</p>
        <table cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">
          <tr><td><strong>Name</strong></td><td>${firstName} ${lastName}</td></tr>
          <tr><td><strong>Email</strong></td><td>${email}</td></tr>
          <tr><td><strong>Phone</strong></td><td>${phone || "—"}</td></tr>
          <tr><td><strong>Property Address</strong></td><td>${address || "—"}</td></tr>
          <tr><td><strong>City</strong></td><td>${cityName || "—"}</td></tr>
          <tr><td><strong>Beds / Baths / Sqft</strong></td><td>${beds ?? "—"} / ${baths ?? "—"} / ${sqft ? sqft.toLocaleString() : "—"}</td></tr>
          <tr><td><strong>Condition</strong></td><td>${condition || "—"}</td></tr>
          <tr><td><strong>Reason</strong></td><td>${reason || "—"}</td></tr>
          <tr><td><strong>Timeframe</strong></td><td>${timeframe || "—"}</td></tr>
          <tr><td><strong>Expected Price</strong></td><td>${expectedPrice ? "$" + expectedPrice.toLocaleString() : "—"}</td></tr>
          <tr><td><strong>Account requested</strong></td><td>${createAccount ? "Yes" : "No"}</td></tr>
        </table>
        ${message ? `<p><strong>Message:</strong></p><p>${message.replace(/\n/g, "<br>")}</p>` : ""}
      `;

      await transporter.sendMail({
        from: `"jpsrealtor.com" <${process.env.EMAIL_USER}>`,
        to: AGENT_EMAIL,
        replyTo: email,
        subject: `New Sell Lead — ${firstName} ${lastName}${cityName ? ` (${cityName})` : ""}`,
        html,
      });
    } catch (mailErr) {
      console.error("[sell-intake] Notification email failed:", mailErr);
    }

    // ---- 3. Optional account creation + password-set email -------------------
    let accountCreated = false;
    if (createAccount) {
      try {
        const lower = email.toLowerCase();
        let user = await User.findOne({ email: lower });

        if (!user) {
          const tempPassword = randomBytes(24).toString("hex");
          const hashed = await bcrypt.hash(tempPassword, 12);
          user = await User.create({
            email: lower,
            password: hashed,
            name: `${firstName} ${lastName}`.trim(),
            phone: phone || undefined,
            roles: ["endUser"],
          });
          accountCreated = true;
        }

        const resetToken = randomBytes(32).toString("hex");
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await user.save();

        const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`;
        await sendPasswordResetEmail(
          user.email,
          resetUrl,
          user.name || firstName
        );
      } catch (acctErr) {
        console.error("[sell-intake] Account creation failed:", acctErr);
      }
    }

    return NextResponse.json({ success: true, accountCreated });
  } catch (err) {
    console.error("[sell-intake] Error:", err);
    return NextResponse.json(
      { error: "Failed to submit lead" },
      { status: 500 }
    );
  }
}

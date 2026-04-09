// src/app/api/leads/buy-intake/route.ts
//
// Handles "Ready to find your home" buy-page lead intake form.
// - Creates a Contact under the primary agent (source: website, tagged "Web Generated Leads")
// - Emails the agent with the lead details
// - Optionally creates a User account and sends a password-set email
//
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import nodemailer from "nodemailer";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import Contact from "@/models/Contact";
import VerificationToken from "@/models/verificationToken";
import { sendLeadWelcomeEmail } from "@/lib/email-resend";

export const dynamic = "force-dynamic";

const AGENT_EMAIL =
  process.env.PRIMARY_AGENT_EMAIL || "josephsardella@gmail.com";

interface BuyIntakeBody {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  cityName?: string;
  cityId?: string;
  budgetMin?: number;
  budgetMax?: number;
  beds?: number;
  baths?: number;
  propertyType?: string;
  timeframe?: string;
  message?: string;
  createAccount?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as BuyIntakeBody;
    const {
      firstName,
      lastName = "",
      email,
      phone,
      cityName,
      cityId,
      budgetMin,
      budgetMax,
      beds,
      baths,
      propertyType,
      timeframe,
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

    // Find primary agent (Contact owner)
    const agentUser = await User.findOne({ email: AGENT_EMAIL.toLowerCase() });
    if (!agentUser) {
      console.error("[buy-intake] Primary agent user not found:", AGENT_EMAIL);
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

    const contactPayload: any = {
      userId: agentUser._id,
      firstName,
      lastName,
      // Legacy fields populated for sparse-index safety + backwards compat.
      phone: phone || undefined,
      email: email.toLowerCase(),
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
      source: "website",
      status: "uncontacted",
      tags: ["Web Generated Leads", "Buy Intake", cityName].filter(
        Boolean
      ) as string[],
      interests: {
        buying: true,
        propertyTypes: propertyType ? [propertyType] : [],
        locations: cityName ? [cityName] : [],
        priceRange:
          budgetMin || budgetMax
            ? { min: budgetMin, max: budgetMax }
            : undefined,
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
      notes: message || undefined,
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

      const fmtMoney = (n?: number) =>
        n ? `$${n.toLocaleString()}` : "—";

      const html = `
        <h2>New Buy-Page Lead${cityName ? ` — ${cityName}` : ""}</h2>
        <p><strong>Source:</strong> Web Generated Leads (Buy Intake)</p>
        <table cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">
          <tr><td><strong>Name</strong></td><td>${firstName} ${lastName}</td></tr>
          <tr><td><strong>Email</strong></td><td>${email}</td></tr>
          <tr><td><strong>Phone</strong></td><td>${phone || "—"}</td></tr>
          <tr><td><strong>City</strong></td><td>${cityName || "—"}</td></tr>
          <tr><td><strong>Budget</strong></td><td>${fmtMoney(budgetMin)} – ${fmtMoney(budgetMax)}</td></tr>
          <tr><td><strong>Beds / Baths</strong></td><td>${beds ?? "—"} / ${baths ?? "—"}</td></tr>
          <tr><td><strong>Property Type</strong></td><td>${propertyType || "—"}</td></tr>
          <tr><td><strong>Timeframe</strong></td><td>${timeframe || "—"}</td></tr>
          <tr><td><strong>Account requested</strong></td><td>${createAccount ? "Yes" : "No"}</td></tr>
        </table>
        ${message ? `<p><strong>Message:</strong></p><p>${message.replace(/\n/g, "<br>")}</p>` : ""}
      `;

      await transporter.sendMail({
        from: `"jpsrealtor.com" <${process.env.EMAIL_USER}>`,
        to: AGENT_EMAIL,
        replyTo: email,
        subject: `New Buy Lead — ${firstName} ${lastName}${cityName ? ` (${cityName})` : ""}`,
        html,
      });
    } catch (mailErr) {
      console.error("[buy-intake] Notification email failed:", mailErr);
      // Non-fatal
    }

    // ---- 3. Optional account creation + password-set email -------------------
    let accountCreated = false;
    if (createAccount) {
      try {
        const lower = email.toLowerCase();
        let user = await User.findOne({ email: lower });

        if (!user) {
          // Random placeholder password — user will set their own (or use OAuth)
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

        // Issue a verification token good for 24h
        const token = randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await VerificationToken.create({
          identifier: lower,
          token,
          expires,
        });

        const verifyUrl = `${process.env.NEXTAUTH_URL}/auth/welcome?token=${token}`;
        const ap: any = (agentUser as any).agentProfile || {};
        await sendLeadWelcomeEmail(user.email, verifyUrl, user.name || firstName, {
          name: agentUser.name,
          headshot: ap.headshot,
          brokerage: ap.brokerageName || (agentUser as any).brokerageName,
          licenseNumber: ap.licenseNumber || (agentUser as any).licenseNumber,
          phone: ap.cellPhone || ap.officePhone || (agentUser as any).phone,
          email: agentUser.email,
          website: ap.customDomain || "jpsrealtor.com",
          brandColor: ap.brandColors?.primary,
          secondaryColor: ap.brandColors?.secondary,
          instagram: ap.socialMedia?.instagram,
          facebook: ap.socialMedia?.facebook,
          youtube: ap.socialMedia?.youtube,
        });
      } catch (acctErr) {
        console.error("[buy-intake] Account creation failed:", acctErr);
        // Non-fatal — lead is still saved
      }
    }

    return NextResponse.json({ success: true, accountCreated });
  } catch (err) {
    console.error("[buy-intake] Error:", err);
    return NextResponse.json(
      { error: "Failed to submit lead" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { handleCors } from "@/utils/handleCors";
import { getListId } from "@/utils/getListId";
import { escapeHtml, isSafeUrl } from "@/lib/security";
import { verifyTurnstile, clientIp, isTrustedInternalCall } from "@/lib/turnstile";
import { checkRateLimit } from "@/lib/rate-limit";

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const JPSREALTOR_SENDFOX_API_TOKEN = process.env.JPSREALTOR_SENDFOX_API_TOKEN;

export async function POST(req: NextRequest) {
  try {
    // Initialize CORS
    const res = NextResponse.next();
    await handleCors(req, res);

    // Build base URL from request host
    const host = req.headers.get("host") || "chatrealty.io";
    const protocol = host.includes("localhost") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    // Parse the request body
    const { firstName, lastName, email, phone, address, message, photos, optIn, turnstileToken } = await req.json();

    // Skip CAPTCHA + rate limit when called server-to-server (e.g. from the
    // register route's SendFox subscription). User-facing browser calls always
    // go through Turnstile.
    if (!isTrustedInternalCall(req)) {
      const ip = clientIp(req) || "unknown";
      const ipLimit = checkRateLimit(`contact:ip:${ip}`, { max: 10, windowMs: 60 * 60 * 1000 });
      if (!ipLimit.ok) {
        return NextResponse.json(
          { error: ipLimit.error },
          { status: ipLimit.status, headers: { "Retry-After": String(ipLimit.retryAfter) } }
        );
      }
      const captcha = await verifyTurnstile(turnstileToken, ip);
      if (!captcha.success) {
        return NextResponse.json(
          { error: captcha.error || "CAPTCHA verification failed" },
          { status: 400 }
        );
      }
    }

    // Configure Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });

    // Email to Admin (Joe)
    const adminMailOptions = {
      from: EMAIL_USER,
      to: EMAIL_USER,
      subject: "New Contact Request from Your Website",
      html: `
        <h2>Hello Joe,</h2>
        <p>You have a new contact request from your website. Here are the details:</p>
        <ul>
          <li><strong>Name:</strong> ${escapeHtml(firstName)} ${escapeHtml(lastName)}</li>
          <li><strong>Phone:</strong> ${escapeHtml(phone)}</li>
          <li><strong>Email:</strong> ${escapeHtml(email)}</li>
          <li><strong>Address:</strong> ${escapeHtml(address)}</li>
          <li><strong>Message:</strong> ${escapeHtml(message)}</li>
        </ul>
        ${
          photos?.length > 0
            ? `<h3>Uploaded Photos:</h3>
               <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                 ${photos
                   .filter((photo: string) => isSafeUrl(photo))
                   .map(
                     (photo: string) =>
                       `<img src="${escapeHtml(photo)}" alt="Uploaded Photo" style="width: 150px; height: auto; border-radius: 8px;" />`
                   )
                   .join("")}
               </div>`
            : "<p>No photos uploaded.</p>"
        }
      `,
    };

    // Confirmation Email to the User
    const userMailOptions = {
      from: EMAIL_USER,
      to: email,
      subject: "Let's keep in touch, I'm here anytime.",
      html: `
        <div>
          <h1>Thank You, ${escapeHtml(firstName)} ${escapeHtml(lastName)}!</h1>
          <p>
            We’re excited to help you achieve your real estate goals here in the beautiful Coachella Valley. 
            Whether you’re buying, selling, or just exploring your options, we’re here to make your experience as seamless as possible.
          </p>
          <p>
            You should also receive a confirmation email shortly for subscribing to my newsletter. 
            Be sure to check your inbox for the latest updates and insights into the Coachella Valley real estate market.
          </p>
          <h2>Explore More on Our Website</h2>
          <ul>
            <li><a href="${baseUrl}/insights">Read Real Estate Insights</a></li>
            <li><a href="${baseUrl}/neighborhoods">Explore Neighborhoods</a></li>
            <li><a href="${baseUrl}/listings">View Available Listings</a></li>
            <li><a href="${baseUrl}/contact">Contact Us</a></li>
          </ul>
          <p>
            If you have any questions or need immediate assistance, feel free to reach out to me directly at:
          </p>
          <p>
            Phone: <a href="tel:7608336334">760-833-6334</a><br>
            Email: <a href="mailto:josephsardella@gmail.com">josephsardella@gmail.com</a>
          </p>
          <p>Thank you for reaching out, and I look forward to assisting you with your real estate journey.</p>
          <p>Best regards,<br>Joseph Sardella | eXp Realty of Southern California<br>Your Trusted Coachella Valley Realtor<br>DRE# 02106916</p>
        </div>
      `,
    };

    // Send Emails
    await transporter.sendMail(adminMailOptions);
    await transporter.sendMail(userMailOptions);

    // Handle SendFox Subscription
    if (optIn && JPSREALTOR_SENDFOX_API_TOKEN) {
      const urlPath = req.nextUrl.pathname; // Get the URL path
      const listId = await getListId(JPSREALTOR_SENDFOX_API_TOKEN, urlPath);

      if (!listId) {
        console.error("Failed to fetch the SendFox list ID.");
        throw new Error("Unable to subscribe user to mailing list.");
      }

      const subscriptionResponse = await fetch("https://api.sendfox.com/contacts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${JPSREALTOR_SENDFOX_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          address,
          phone_number: phone,
          first_name: firstName,
          last_name: lastName,
          lists: [listId],
        }),
      });

      if (!subscriptionResponse.ok) {
        const errorText = await subscriptionResponse.text();
        console.error("Failed to add contact to SendFox:", errorText);
        throw new Error("Failed to add contact to SendFox.");
      }
    }

    return NextResponse.json({ message: "Emails sent successfully!" }, { status: 200 });
  } catch (error) {
    console.error("Error submitting form:", (error as Error).message);
    return NextResponse.json(
      { message: "Failed to send email or subscribe contact.", error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  const res = NextResponse.next();
  await handleCors(req, res);
  return res;
}
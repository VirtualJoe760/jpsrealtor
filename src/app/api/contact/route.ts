import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { handleCors } from "@/utils/handleCors";
import { getListId } from "@/utils/getListId";

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const SENDFOX_API_TOKEN = process.env.JPSREALTOR_SENDFOX_API_TOKEN;

export async function POST(req: NextRequest) {
  try {
    // Initialize CORS
    const res = NextResponse.next();
    await handleCors(req, res);

    // Parse the request body
    const { firstName, lastName, email, phone, address, message, photos, optIn } = await req.json();

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
          <li><strong>Name:</strong> ${firstName} ${lastName}</li>
          <li><strong>Phone:</strong> ${phone}</li>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Address:</strong> ${address}</li>
          <li><strong>Message:</strong> ${message}</li>
        </ul>
        ${
          photos?.length > 0
            ? `<h3>Uploaded Photos:</h3>
               <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                 ${photos
                   .map(
                     (photo: string) =>
                       `<img src="${photo}" alt="Uploaded Photo" style="width: 150px; height: auto; border-radius: 8px;" />`
                   )
                   .join("")}
               </div>`
            : "<p>No photos uploaded.</p>"
        }
      `,
    };

    // Confirmation email to the User
    const userMailOptions = {
      from: EMAIL_USER,
      to: email,
      subject: "Thank You for Contacting Us!",
      html: `
        <div style="background-color: #000; color: #fff; font-family: 'Raleway', sans-serif; padding: 20px; text-align: center;">
          <h1 style="font-size: 2rem; font-weight: 600; margin-bottom: 1rem;">
            Thank You, ${firstName} ${lastName}!
          </h1>
          <p style="font-size: 1.1rem; margin-bottom: 1.5rem; line-height: 1.6;">
            We’re excited to help you achieve your real estate goals here in the beautiful Coachella Valley. 
            Whether you’re buying, selling, or exploring options, we’re here to make your experience seamless and successful.
          </p>
        </div>
      `,
    };

    // Send emails
    await transporter.sendMail(adminMailOptions);
    await transporter.sendMail(userMailOptions);

    // Handle SendFox Subscription
    if (optIn && SENDFOX_API_TOKEN) {
      const listId = await getListId(SENDFOX_API_TOKEN, "jpsrealtor");
      if (!listId) {
        console.error("Failed to fetch the SendFox list ID for 'jpsrealtor'.");
        throw new Error("Unable to subscribe user to mailing list.");
      }

      const subscriptionResponse = await fetch("https://api.sendfox.com/contacts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SENDFOX_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
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

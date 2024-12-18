import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { handleCors } from "@/utils/handleCors";

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

export async function POST(req: NextRequest) {
  try {
    // Initialize CORS
    const res = NextResponse.next();
    await handleCors(req, res);

    // Parse the request body
    const { firstName, lastName, email, phone, address, message, photos } = await req.json();

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
          <hr style="border: 0; height: 1px; background-color: #fff; margin: 1.5rem auto; width: 60%;" />
          <h2 style="font-size: 1.5rem; font-weight: 500; margin-bottom: 1rem;">
            Here's the Information You Submitted:
          </h2>
          <ul style="list-style: none; padding: 0; font-size: 1rem; line-height: 1.8; margin: 0 auto; max-width: 600px; text-align: left;">
            <li><strong>Name:</strong> ${firstName} ${lastName}</li>
            <li><strong>Phone:</strong> ${phone}</li>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Address:</strong> ${address}</li>
            <li><strong>Message:</strong> ${message}</li>
          </ul>
          <div style="margin: 2rem 0;">
            <a href="https://www.jpsrealtor.com/insights" style="text-decoration: none; color: #000; background-color: #fff; padding: 10px 20px; border-radius: 5px; font-size: 1rem; font-weight: 600; margin-right: 10px; display: inline-block;">
              Read Estate Insights
            </a>
            <a href="https://www.jpsrealtor.com/listings" style="text-decoration: none; color: #000; background-color: #fff; padding: 10px 20px; border-radius: 5px; font-size: 1rem; font-weight: 600; display: inline-block;">
              Browse Properties
            </a>
          </div>
          <p style="font-size: 1rem; margin-top: 1.5rem; line-height: 1.6;">
            We look forward to connecting with you and assisting in your real estate journey.  
            Feel free to reach out anytime!
          </p>
          <p style="margin-top: 2rem; font-size: 0.9rem; opacity: 0.7;">
            Joseph Sardella | JPS Realtor | eXp Realty | Obsidian Group
          </p>
        </div>
      `,
    };

    // Send emails
    await transporter.sendMail(adminMailOptions);
    await transporter.sendMail(userMailOptions);

    return NextResponse.json({ message: "Emails sent successfully!" }, { status: 200 });
  } catch (error) {
    console.error("Error sending email:", (error as Error).message);
    return NextResponse.json(
      { message: "Failed to send email.", error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  const res = NextResponse.next();
  await handleCors(req, res);
  return res;
}

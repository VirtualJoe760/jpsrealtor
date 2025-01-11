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

    const userMailOptions = {
      from: EMAIL_USER,
      to: email,
      subject: "Lets keep in touch, I'm here anytime.",
      html: `
        <div>
          <h1>Thank You, ${firstName} ${lastName}!</h1>
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
            <li><a href="https://www.jpsrealtor.com/insights">Read Real Estate Insights</a></li>
            <li><a href="https://www.jpsrealtor.com/neighborhoods">Explore Neighborhoods</a></li>
            <li><a href="https://www.jpsrealtor.com/listings">View Available Listings</a></li>
            <li><a href="https://www.jpsrealtor.com/contact">Contact Us</a></li>
          </ul>
    
          <p>
            If you have any questions or need immediate assistance, feel free to reach out to me directly at:
          </p>
          <p>
            Phone: <a href="tel:7608336334">760-833-6334</a><br>
            Email: <a href="mailto:josephsardella@gmail.com">josephsardella@gmail.com</a>
          </p>
    
          <p>
            Thank you for reaching out, and I look forward to assisting you with your real estate journey.
          </p>
    
          <p>Best regards,<br>Joseph Sardella<br>Your Trusted Coachella Valley Realtor</p>
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

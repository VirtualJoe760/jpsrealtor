import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

dotenv.config({ path: '.env.local' });

const testMode = false; // Change to false when you're ready to go live

const htmlTemplate = fs.readFileSync(
  path.join(__dirname, 'data', 'emails', 'miralesteEmailMarketing.html'),
  'utf-8'
);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ NEW contact sheet
const xlsxPath = path.join(__dirname, 'data', 'skiptrace', 'beverly-grove-farm-st.xlsx');
const sentLogPath = path.join(__dirname, 'data', 'miraleste_sent_log.csv');

const sentEmails = new Set<string>();
if (!testMode && fs.existsSync(sentLogPath)) {
  const sentData = fs.readFileSync(sentLogPath, 'utf-8').split('\n');
  for (const line of sentData) {
    const email = line.trim();
    if (email) sentEmails.add(email);
  }
}

const appendLog = fs.createWriteStream(sentLogPath, { flags: 'a' });

type ContactRow = {
  first_name: string;
  last_name?: string;
  email: string;
};

function loadContactsFromXLSX(): ContactRow[] {
  const workbook = XLSX.readFile(xlsxPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName as keyof typeof workbook.Sheets];

  if (!sheet) throw new Error(`Sheet "${sheetName}" not found in workbook.`);

  const rawData = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[];

  const contacts: ContactRow[] = [];

  for (const row of rawData) {
    const firstName = typeof row['First Name'] === 'string' ? row['First Name'].trim() : '';
    const lastName = typeof row['Last Name'] === 'string' ? row['Last Name'].trim() : '';

    const email =
      [row['Email 1'], row['Email 2'], row['Email 3'], row['Email 4']]
        .find((e) => typeof e === 'string' && e.trim().length > 0)?.trim() || '';

    if (!firstName || !email) continue;
    if (!testMode && sentEmails.has(email)) continue;

    contacts.push({ first_name: firstName, last_name: lastName, email });
  }

  return contacts;
}

async function sendEmails() {
  const contacts = loadContactsFromXLSX();
  let emailsSent = 0;

  if (testMode) {
    console.log(`🧪 TEST MODE ENABLED — Found ${contacts.length} contact(s)`);
    if (contacts.length === 0) return console.warn('⚠️ No valid contacts found.');

    const html = htmlTemplate.replace('{{contact.first_name}}', 'Joseph');

    const testMail = {
      from: `"Joseph Sardella" <${process.env.EMAIL_USER}>`,
      to: 'josephsardella@gmail.com',
      subject: '🧪 TEST: You have to see this beautiful listing in Palm Spring!',
      html,
      attachments: [
        {
          filename: 'email-banner.png',
          path: path.join(process.cwd(), 'public', 'joey', 'email-banner.png'),
          cid: 'email-banner',
          contentType: 'image/png',
        },
      ],
    };

    try {
      const info = await transporter.sendMail(testMail);
      emailsSent++;
      console.log(`✅ Test email sent: ${info.response}`);
    } catch (err) {
      console.error('❌ Failed to send test email:', err);
    }

    console.log(`📤 Emails processed: ${emailsSent}`);
    return;
  }

  for (const contact of contacts) {
    const html = htmlTemplate.replace('{{contact.first_name}}', contact.first_name);

    const mailOptions = {
      from: `"Joseph Sardella" <${process.env.EMAIL_USER}>`,
      to: contact.email,
      subject: 'You have to see this beautiful listing in Palm Spring!',
      html,
      attachments: [
        {
          filename: 'email-banner.png',
          path: path.join(process.cwd(), 'public', 'joey', 'email-banner.png'),
          cid: 'email-banner',
          contentType: 'image/png',
        },
      ],
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Sent to ${contact.first_name} <${contact.email}>: ${info.response}`);
      appendLog.write(`${contact.email}\n`);
      emailsSent++;
      await new Promise((r) => setTimeout(r, 5000));
    } catch (err) {
      console.error(`❌ Failed to send to ${contact.email}:`, err);
    }
  }

  appendLog.end();
  console.log(`📤 All emails processed. Total sent: ${emailsSent}`);
}

sendEmails();

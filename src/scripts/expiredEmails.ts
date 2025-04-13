import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

dotenv.config({ path: '.env.local' });

const testMode = false; // ✅ Toggle this to false to send for real

const htmlTemplate = fs.readFileSync(
  path.join(__dirname, 'emailTemplate.html'),
  'utf-8'
);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const csvPath = path.join(process.cwd(), 'src', 'scripts', 'data', 'Filtered_Coachella___Morongo_Expired_Contacts.csv');
const sentLogPath = path.join(process.cwd(), 'src', 'scripts', 'data', 'sent_log.csv');

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
    phone?: string;
    [key: string]: string | undefined;
  };
  

const allRecipients: ContactRow[] = [];

fs.createReadStream(csvPath)
  .pipe(csv())
  .on('data', (row: ContactRow) => {
    const firstName = row['first_name']?.trim();
    const email = row['email']?.trim();
    if (!firstName || !email) return;
    if (!testMode && sentEmails.has(email)) return;
    allRecipients.push(row);
  })
  .on('end', async () => {
    if (testMode) {
      // === Log summary
      console.log(`🧪 TEST MODE ENABLED — Total contacts found: ${allRecipients.length}`);
      allRecipients.forEach((contact, i) => {
        console.log(
          `${i + 1}. ${contact.first_name} ${contact.last_name || ''} — ${contact.email} ${contact.phone ? `| 📞 ${contact.phone}` : ''}`
        );
      });

      // === Send just one test email to you
      if (allRecipients.length === 0) return console.log('⚠️ No contacts to send.');
      const testHtml = htmlTemplate.replace('{{contact.first_name}}', 'Joseph');

      const testMail = {
        from: `"Joseph Sardella" <${process.env.EMAIL_USER}>`,
        to: 'josephsardella@gmail.com',
        subject: '🧪 TEST: Did your house sell yet?',
        html: testHtml,
        attachments: [
          {
            filename: 'email-banner.png',
            path: path.join(process.cwd(), 'public', 'joey', 'email-banner.png'),
            cid: 'email-banner',
            contentType: 'image/png',
          },
          {
            filename: 'obsidian-about.jpg',
            path: path.join(process.cwd(), 'public', 'marketing', 'obsidian-about.jpg'),
            contentType: 'image/jpeg',
          },
          {
            filename: 'sellers-coverage.pdf',
            path: path.join(process.cwd(), 'public', 'marketing', 'sellers-coverage.pdf'),
            contentType: 'application/pdf',
          },
          {
            filename: 'listnlock.jpg',
            path: path.join(process.cwd(), 'public', 'marketing', 'listnlock.jpg'),
            contentType: 'image/jpeg',
          },
        ],
      };

      try {
        const info = await transporter.sendMail(testMail);
        console.log(`✅ Test email sent to Joseph Sardella: ${info.response}`);
      } catch (err) {
        console.error('❌ Failed to send test email:', err);
      }

      return;
    }

    // === Send real emails
    for (const contact of allRecipients) {
      const firstName = contact.first_name;
      const email = contact.email;
      const personalizedHtml = htmlTemplate.replace('{{contact.first_name}}', firstName);

      const mailOptions = {
        from: `"Joseph Sardella" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Did your house sell yet?',
        html: personalizedHtml,
        attachments: [
          {
            filename: 'email-banner.png',
            path: path.join(process.cwd(), 'public', 'joey', 'email-banner.png'),
            cid: 'email-banner',
            contentType: 'image/png',
          },
          {
            filename: 'obsidian-about.jpg',
            path: path.join(process.cwd(), 'public', 'marketing', 'obsidian-about.jpg'),
            contentType: 'image/jpeg',
          },
          {
            filename: 'sellers-coverage.pdf',
            path: path.join(process.cwd(), 'public', 'marketing', 'sellers-coverage.pdf'),
            contentType: 'application/pdf',
          },
          {
            filename: 'listnlock.jpg',
            path: path.join(process.cwd(), 'public', 'marketing', 'listnlock.jpg'),
            contentType: 'image/jpeg',
          },
        ],
      };

      try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Sent to ${firstName} <${email}>: ${info.response}`);
        appendLog.write(`${email}\n`);
        await new Promise((r) => setTimeout(r, 5000));
      } catch (err) {
        console.error(`❌ Failed to send to ${email}:`, err);
      }
    }

    appendLog.end();
    console.log('📤 All emails processed.');
  });

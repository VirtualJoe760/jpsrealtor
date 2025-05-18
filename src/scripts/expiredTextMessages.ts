import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { exec } from 'child_process';  // To execute AppleScript

const testMode = true; // ✅ Toggle this to true to send the test message

const testPhoneNumber = '760-833-6334'; // Test phone number
const testAddress = '73120 Santa Rosa Way Apt A Palm Desert CA 92260'; // Test address

const csvPath = path.join(process.cwd(), 'src', 'scripts', 'data', 'Filtered_Coachella___Morongo_Expired_Contacts.csv');

// A set to keep track of the contacts we have already sent messages to (for test mode)
const sentLogPath = path.join(process.cwd(), 'src', 'scripts', 'data', 'sent_log.csv');
const sentNumbers = new Set<string>();
if (!testMode && fs.existsSync(sentLogPath)) {
  const sentData = fs.readFileSync(sentLogPath, 'utf-8').split('\n');
  for (const line of sentData) {
    const number = line.trim();
    if (number) sentNumbers.add(number);
  }
}

const appendLog = fs.createWriteStream(sentLogPath, { flags: 'a' });

type ContactRow = {
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  address?: string;
  [key: string]: string | undefined;
};

const allRecipients: ContactRow[] = [];

fs.createReadStream(csvPath)
  .pipe(csv())
  .on('data', (row: ContactRow) => {
    const firstName = row['first_name']?.trim();
    const phone = row['phone']?.trim();
    const address = row['address']?.trim();
    if (!firstName || !phone || !address) return;  // Skip if no phone number or address
    if (!testMode && sentNumbers.has(phone)) return;  // Skip if number already processed
    allRecipients.push(row);
  })
  .on('end', async () => {
    if (testMode) {
      console.log(`🧪 TEST MODE ENABLED — Sending to test number: ${testPhoneNumber}`);

      // Test message to the test number
      const message = `Hey, my name's Joseph Sardella with eXp Realty. I wanted to know if your property at ${testAddress} was sold yet?`;

      const appleScript = `
      tell application "Messages"
          set targetService to 1st service whose service type = iMessage
          set targetBuddy to "${testPhoneNumber}"
          send "${message}" to buddy targetBuddy of targetService
      end tell
      `;

      try {
        exec(`osascript -e '${appleScript}'`, (err, stdout, stderr) => {
          if (err) {
            console.error(`❌ Failed to send test message:`, stderr);
          } else {
            console.log(`✅ Test message sent to ${testPhoneNumber}: ${stdout}`);
          }
        });

      } catch (err) {
        console.error(`❌ Failed to send test message:`, err);
      }
      return;
    }

    // === Send real messages ===
    for (const contact of allRecipients) {
      const firstName = contact.first_name;
      const phone = contact.phone;
      const address = contact.address;
      const message = `Hey, my name's Joseph Sardella with eXp Realty. I wanted to know if your property at ${address} was sold yet?`;

      const appleScript = `
      tell application "Messages"
          set targetService to 1st service whose service type = iMessage
          set targetBuddy to "${phone}"
          send "${message}" to buddy targetBuddy of targetService
      end tell
      `;

      try {
        exec(`osascript -e '${appleScript}'`, (err, stdout, stderr) => {
          if (err) {
            console.error(`❌ Failed to send to ${phone}:`, stderr);
          } else {
            console.log(`✅ Sent to ${firstName} <${phone}>: ${stdout}`);
            appendLog.write(`${phone}\n`);
          }
        });

        // Add delay between sending messages (e.g., 5 seconds) to avoid spamming too fast
        await new Promise((resolve) => setTimeout(resolve, 5000));

      } catch (err) {
        console.error(`❌ Failed to send to ${phone}:`, err);
      }
    }

    appendLog.end();
    console.log('📤 All messages processed.');
  });

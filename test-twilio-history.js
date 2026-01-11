/**
 * Test script to fetch conversation history from Twilio
 */

require('dotenv').config({ path: '.env.local' });
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

console.log('=== Twilio Message History Test ===\n');
console.log('Account SID:', accountSid ? `${accountSid.substring(0, 10)}...` : 'MISSING');
console.log('Auth Token:', authToken ? 'SET' : 'MISSING');
console.log('Twilio Number:', twilioPhoneNumber || 'MISSING');
console.log('\n');

if (!accountSid || !authToken || !twilioPhoneNumber) {
  console.error('ERROR: Missing Twilio credentials in .env.local');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

async function fetchAllMessages() {
  try {
    console.log('Fetching ALL messages from Twilio...\n');

    const messages = await client.messages.list({ limit: 100 });

    console.log(`Found ${messages.length} total messages\n`);
    console.log('='.repeat(80));

    messages.forEach((msg, index) => {
      console.log(`\nMessage ${index + 1}:`);
      console.log('  SID:', msg.sid);
      console.log('  From:', msg.from);
      console.log('  To:', msg.to);
      console.log('  Direction:', msg.direction);
      console.log('  Status:', msg.status);
      console.log('  Date:', msg.dateSent || msg.dateCreated);
      console.log('  Body:', msg.body.substring(0, 100) + (msg.body.length > 100 ? '...' : ''));
      console.log('  -'.repeat(40));
    });

    console.log('\n' + '='.repeat(80));
    console.log('\nSummary:');
    console.log('  Total messages:', messages.length);

    const inbound = messages.filter(m => m.direction === 'inbound' || m.direction.includes('inbound'));
    const outbound = messages.filter(m => m.direction === 'outbound' || m.direction.includes('outbound'));

    console.log('  Inbound:', inbound.length);
    console.log('  Outbound:', outbound.length);

    // Group by phone number
    const conversations = {};
    messages.forEach(msg => {
      const otherNumber = msg.direction.includes('inbound') ? msg.from : msg.to;
      if (!conversations[otherNumber]) {
        conversations[otherNumber] = [];
      }
      conversations[otherNumber].push(msg);
    });

    console.log('\nConversations:');
    Object.keys(conversations).forEach(number => {
      console.log(`  ${number}: ${conversations[number].length} messages`);
    });

  } catch (error) {
    console.error('ERROR fetching messages:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.status) {
      console.error('HTTP status:', error.status);
    }
  }
}

fetchAllMessages();

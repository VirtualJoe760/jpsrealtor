import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

async function testCampaign() {
  console.log('=== Testing Voicemail Campaign ===\n');

  // Step 1: Generate AI Voice
  console.log('Step 1: Generating AI voicemail...');
  const voicemailText = "Hi, this is Joseph Sardella with eXp Realty. I'm calling to follow up on your recent inquiry about homes in Palm Desert. I have some exciting new listings that just came on the market. Give me a call back at 760-333-3676. Thanks!";

  const audioResponse = await fetch('http://localhost:3000/api/voicemail/generate-audio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: voicemailText })
  });

  const audioData = await audioResponse.json();

  if (!audioData.success) {
    console.error('❌ Failed to generate audio:', audioData.error);
    return;
  }

  console.log('✅ Audio generated successfully');
  console.log(`   Audio size: ${audioData.audio.length} bytes (base64)\n`);

  // Convert base64 to buffer and save as MP3
  const audioBuffer = Buffer.from(audioData.audio, 'base64');
  fs.writeFileSync('test-voicemail.mp3', audioBuffer);
  console.log('✅ Saved audio to test-voicemail.mp3\n');

  // Step 2: Create Campaign
  console.log('Step 2: Creating campaign with Drop Cowboy...');

  const formData = new FormData();
  formData.append('contacts', fs.createReadStream('test-contacts.csv'));
  formData.append('audio', fs.createReadStream('test-voicemail.mp3'));
  formData.append('campaignName', 'Test Campaign - Joseph');
  // Brand ID is optional - only add if you have one
  if (process.env.DROP_COWBOY_BRAND_ID) {
    formData.append('brandId', process.env.DROP_COWBOY_BRAND_ID);
  }
  formData.append('forwardingNumber', '+17603333676');

  const campaignResponse = await fetch('http://localhost:3000/api/dropcowboy/campaign', {
    method: 'POST',
    body: formData
  });

  const campaignData = await campaignResponse.json();

  if (!campaignResponse.ok) {
    console.error('❌ Campaign failed:', campaignData.error);
    console.error('   Details:', campaignData.details);
    return;
  }

  console.log('✅ Campaign created successfully!\n');
  console.log('=== Campaign Results ===');
  console.log(`Campaign Name: ${campaignData.campaignName}`);
  console.log(`Recording ID: ${campaignData.recordingId}`);
  console.log(`Total Contacts: ${campaignData.totalContacts}`);
  console.log(`Successful: ${campaignData.successCount}`);
  console.log(`Failed: ${campaignData.failureCount}\n`);

  if (campaignData.results && campaignData.results.length > 0) {
    console.log('=== Detailed Results ===');
    campaignData.results.forEach((result, i) => {
      console.log(`${i + 1}. ${result.phone}: ${result.status}`);
      if (result.dropId) console.log(`   Drop ID: ${result.dropId}`);
      if (result.error) console.log(`   Error: ${result.error}`);
    });
  }
}

testCampaign().catch(console.error);

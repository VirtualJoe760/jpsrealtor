import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { parse } from 'dotenv';
import { stripeConfiguration } from '../src/lib/stripe-mode';
import { twilioVoiceConfiguration } from '../src/lib/dialer/twilio-voice-config';

// Inspect configuration only. Do not initialize DB/Stripe/Twilio clients.
const file = resolve(__dirname, '..', '.env.local');
const local = existsSync(file) ? parse(readFileSync(file)) : {};
const env = { ...local, ...process.env };
const stripe = stripeConfiguration(env);
console.log(JSON.stringify({
  stripe,
  voice: {
    ...twilioVoiceConfiguration(env),
    twimlAppConfigured: !!env.TWILIO_VOICE_TWIML_APP_SID,
  },
  note: 'Configuration presence only; no provider request or database operation performed.',
}, null, 2));

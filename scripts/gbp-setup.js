#!/usr/bin/env node
/**
 * Google Business Profile API Setup
 *
 * Reuses the existing GSC OAuth credentials and adds GBP scopes.
 * Stores the token at ~/.claude/gbp-token.json
 *
 * Usage:
 *   Step 1: Enable APIs first:
 *     gcloud services enable mybusinessbusinessinformation.googleapis.com mybusinessaccountmanagement.googleapis.com businessprofileperformance.googleapis.com --project=jpsrealtor
 *
 *   Step 2: Run this script:
 *     node scripts/gbp-setup.js auth     # Opens browser for OAuth consent
 *     node scripts/gbp-setup.js accounts  # List your GBP accounts
 *     node scripts/gbp-setup.js locations # List business locations
 *     node scripts/gbp-setup.js info      # Show current business info
 *     node scripts/gbp-setup.js update    # Update business description, hours, etc.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { URL } = require('url');

const CREDS_PATH = path.join(process.env.HOME || process.env.USERPROFILE, '.claude', 'gbp-credentials.json');
const TOKEN_PATH = path.join(process.env.HOME || process.env.USERPROFILE, '.claude', 'gbp-token.json');

const SCOPES = [
  'https://www.googleapis.com/auth/business.manage',
];

function loadCredentials() {
  const data = JSON.parse(fs.readFileSync(CREDS_PATH, 'utf-8'));
  return data.installed;
}

function loadToken() {
  if (!fs.existsSync(TOKEN_PATH)) return null;
  return JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
}

function saveToken(token) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
}

async function refreshToken(creds, token) {
  const params = new URLSearchParams({
    client_id: creds.client_id,
    client_secret: creds.client_secret,
    refresh_token: token.refresh_token,
    grant_type: 'refresh_token',
  });

  const resp = await fetch(creds.token_uri, {
    method: 'POST',
    body: params,
  });
  const data = await resp.json();
  if (data.error) throw new Error(`Token refresh failed: ${data.error_description || data.error}`);

  token.access_token = data.access_token;
  if (data.refresh_token) token.refresh_token = data.refresh_token;
  saveToken(token);
  return token;
}

async function getAccessToken() {
  const creds = loadCredentials();
  let token = loadToken();
  if (!token) {
    console.error('No GBP token found. Run: node scripts/gbp-setup.js auth');
    process.exit(1);
  }
  token = await refreshToken(creds, token);
  return token.access_token;
}

async function apiCall(url, method = 'GET', body = null) {
  const accessToken = await getAccessToken();
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const resp = await fetch(url, opts);
  const data = await resp.json();
  if (!resp.ok) {
    console.error('API Error:', resp.status, JSON.stringify(data, null, 2));
    process.exit(1);
  }
  return data;
}

// ── AUTH ─────────────────────────────────────────────────────────────────────

async function doAuth() {
  const creds = loadCredentials();
  const redirectUri = 'http://localhost:3456';

  const authUrl = new URL(creds.auth_uri);
  authUrl.searchParams.set('client_id', creds.client_id);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', SCOPES.join(' '));
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  console.log('\nOpen this URL in your browser:\n');
  console.log(authUrl.toString());
  console.log('\nWaiting for authorization...');

  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:3456`);
      const code = url.searchParams.get('code');

      if (!code) {
        res.writeHead(400);
        res.end('No code received');
        return;
      }

      // Exchange code for tokens
      const params = new URLSearchParams({
        code,
        client_id: creds.client_id,
        client_secret: creds.client_secret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      });

      const tokenResp = await fetch(creds.token_uri, { method: 'POST', body: params });
      const tokenData = await tokenResp.json();

      if (tokenData.error) {
        res.writeHead(400);
        res.end(`Error: ${tokenData.error_description}`);
        console.error('Auth failed:', tokenData);
        server.close();
        process.exit(1);
      }

      saveToken(tokenData);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>GBP Authorization successful!</h1><p>You can close this tab.</p>');
      console.log('\nAuthorization successful! Token saved to', TOKEN_PATH);
      server.close();
      resolve();
    });

    server.listen(3456, () => {
      // Try to open browser automatically
      const { exec } = require('child_process');
      exec(`start "" "${authUrl.toString()}"`, () => {});
    });
  });
}

// ── ACCOUNTS ────────────────────────────────────────────────────────────────

async function listAccounts() {
  const data = await apiCall('https://mybusinessaccountmanagement.googleapis.com/v1/accounts');
  console.log('\n=== GBP Accounts ===\n');
  if (!data.accounts || data.accounts.length === 0) {
    console.log('No accounts found. Make sure you have a Google Business Profile.');
    return;
  }
  for (const acct of data.accounts) {
    console.log(`  Name: ${acct.name}`);
    console.log(`  Account Name: ${acct.accountName}`);
    console.log(`  Type: ${acct.type}`);
    console.log(`  Role: ${acct.role}`);
    console.log('  ---');
  }
  return data.accounts;
}

// ── LOCATIONS ───────────────────────────────────────────────────────────────

async function listLocations() {
  const accounts = await listAccounts();
  if (!accounts || accounts.length === 0) return;

  for (const acct of accounts) {
    console.log(`\n=== Locations for ${acct.accountName} ===\n`);
    const data = await apiCall(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${acct.name}/locations?readMask=name,title,storefrontAddress,websiteUri,phoneNumbers,regularHours,profile`
    );

    if (!data.locations || data.locations.length === 0) {
      console.log('  No locations found.');
      continue;
    }

    for (const loc of data.locations) {
      console.log(`  Location ID: ${loc.name}`);
      console.log(`  Title: ${loc.title}`);
      if (loc.storefrontAddress) {
        const addr = loc.storefrontAddress;
        console.log(`  Address: ${addr.addressLines?.join(', ')} ${addr.locality}, ${addr.administrativeArea} ${addr.postalCode}`);
      }
      if (loc.websiteUri) console.log(`  Website: ${loc.websiteUri}`);
      if (loc.phoneNumbers?.primaryPhone) console.log(`  Phone: ${loc.phoneNumbers.primaryPhone}`);
      if (loc.profile?.description) console.log(`  Description: ${loc.profile.description.substring(0, 100)}...`);
      console.log('  ---');
    }
    return data.locations;
  }
}

// ── INFO ────────────────────────────────────────────────────────────────────

async function showInfo() {
  const accounts = await apiCall('https://mybusinessaccountmanagement.googleapis.com/v1/accounts');
  if (!accounts.accounts?.length) { console.log('No accounts'); return; }

  const acct = accounts.accounts[0];
  const data = await apiCall(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${acct.name}/locations?readMask=name,title,storefrontAddress,websiteUri,phoneNumbers,regularHours,profile,categories,serviceArea,labels`
  );

  if (!data.locations?.length) { console.log('No locations'); return; }

  console.log('\n=== Full Business Info ===\n');
  console.log(JSON.stringify(data.locations[0], null, 2));
}

// ── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  const cmd = process.argv[2] || 'help';

  switch (cmd) {
    case 'auth':
      await doAuth();
      break;
    case 'accounts':
      await listAccounts();
      break;
    case 'locations':
      await listLocations();
      break;
    case 'info':
      await showInfo();
      break;
    default:
      console.log('Usage:');
      console.log('  node scripts/gbp-setup.js auth      # Authorize with Google');
      console.log('  node scripts/gbp-setup.js accounts   # List GBP accounts');
      console.log('  node scripts/gbp-setup.js locations  # List business locations');
      console.log('  node scripts/gbp-setup.js info       # Show full business info');
  }
}

main().catch(console.error);

/**
 * Google Contacts Import API
 *
 * Import contacts from Google Contacts API using OAuth
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { google } from 'googleapis';
import connectDB from '@/lib/mongodb';
import Contact from '@/models/Contact';

// ============================================================================
// GET /api/crm/contacts/import/google
// Redirect to Google OAuth for Contacts API access
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      const errorUrl = new URL('/admin/crm', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');
      errorUrl.searchParams.set('error', 'Unauthorized - please sign in');
      return NextResponse.redirect(errorUrl.toString());
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    // Step 1: If no code, redirect to Google OAuth
    if (!code) {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/crm/contacts/import/google`
      );

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/contacts.readonly'],
        prompt: 'consent',
      });

      return NextResponse.redirect(authUrl);
    }

    // Step 2: Exchange code for tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/crm/contacts/import/google`
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Step 3: Fetch contacts from Google People API
    const people = google.people({ version: 'v1', auth: oauth2Client });

    const response = await people.people.connections.list({
      resourceName: 'people/me',
      pageSize: 1000,
      personFields: 'names,emailAddresses,phoneNumbers,addresses,organizations,userDefined',
    });

    const connections = response.data.connections || [];

    console.log(`[Google Import] Found ${connections.length} contacts`);

    // Step 4: Process and save contacts
    await connectDB();

    const importedContacts = [];
    const skippedContacts = [];
    const errors = [];

    for (const person of connections) {
      try {
        // Extract name
        const name = person.names?.[0];
        if (!name?.givenName && !name?.familyName) {
          skippedContacts.push({ reason: 'No name', person });
          continue;
        }

        // Extract phone number
        const phoneNumbers = person.phoneNumbers?.filter(
          (p) => p.value && p.value.trim()
        );
        if (!phoneNumbers || phoneNumbers.length === 0) {
          skippedContacts.push({ reason: 'No phone number', person });
          continue;
        }

        // Get primary phone (or first available)
        const primaryPhone = phoneNumbers.find((p) => p.metadata?.primary) || phoneNumbers[0];
        const phone = formatPhoneForE164(primaryPhone.value || '');

        if (!phone) {
          skippedContacts.push({ reason: 'Invalid phone format', person });
          continue;
        }

        // Extract email
        const emails = person.emailAddresses?.filter((e) => e.value);
        const primaryEmail = emails?.find((e) => e.metadata?.primary) || emails?.[0];

        // Extract address
        const addresses = person.addresses;
        const primaryAddress = addresses?.find((a) => a.metadata?.primary) || addresses?.[0];

        // Check if contact already exists FOR THIS USER
        const existingContact = await Contact.findOne({
          userId: session.user.id,
          phone
        });

        if (existingContact) {
          skippedContacts.push({ reason: 'Already exists', phone, person });
          continue;
        }

        // Extract organization (for tags)
        const organization = person.organizations?.[0];
        const tags = [];
        if (organization?.name) {
          tags.push(organization.name);
        }

        // Create contact with userId
        const contact = await Contact.create({
          userId: session.user.id,
          firstName: name.givenName || 'Unknown',
          lastName: name.familyName || '',
          email: primaryEmail?.value,
          phone,
          address: primaryAddress
            ? {
                street: primaryAddress.streetAddress,
                city: primaryAddress.city,
                state: primaryAddress.region,
                zip: primaryAddress.postalCode,
              }
            : undefined,
          source: 'google_import',
          status: 'new',
          tags,
          preferences: {
            smsOptIn: false, // Default to false, user must manually opt-in
            emailOptIn: false,
            callOptIn: false,
          },
          notes: organization?.title
            ? `Imported from Google Contacts. Title: ${organization.title}`
            : 'Imported from Google Contacts',
        });

        importedContacts.push(contact);
      } catch (error: any) {
        console.error('[Google Import] Error processing contact:', error);
        errors.push({ person, error: error.message });
      }
    }

    console.log(`[Google Import] Imported: ${importedContacts.length}, Skipped: ${skippedContacts.length}, Errors: ${errors.length}`);

    // Return success with redirect to CRM
    const successUrl = new URL('/admin/crm', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');
    successUrl.searchParams.set('imported', importedContacts.length.toString());
    successUrl.searchParams.set('skipped', skippedContacts.length.toString());

    return NextResponse.redirect(successUrl.toString());
  } catch (error: any) {
    console.error('[Google Import] Error:', error);

    // Redirect to CRM with error
    const errorUrl = new URL('/admin/crm', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');
    errorUrl.searchParams.set('error', error.message);

    return NextResponse.redirect(errorUrl.toString());
  }
}

// ============================================================================
// Helper: Format phone number to E.164
// ============================================================================

function formatPhoneForE164(phone: string): string | null {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // If starts with 1 and has 11 digits (US)
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // If 10 digits (US without country code)
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // If already has + and sufficient length
  if (phone.startsWith('+') && digits.length >= 10) {
    return `+${digits}`;
  }

  // Invalid
  return null;
}

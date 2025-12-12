/**
 * vCard Import API
 *
 * Import contacts from vCard (.vcf) files (Apple Contacts, Outlook, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Contact from '@/models/contact';

// ============================================================================
// POST /api/crm/contacts/import/vcard
// Parse vCard file and import contacts
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Read file content
    const fileContent = await file.text();

    // Parse vCard data
    const vCards = parseVCards(fileContent);

    console.log(`[vCard Import] Found ${vCards.length} contacts`);

    const importedContacts = [];
    const skippedContacts = [];
    const errors = [];

    for (const vCard of vCards) {
      try {
        // Validate required fields
        if (!vCard.firstName && !vCard.lastName) {
          skippedContacts.push({ reason: 'No name', vCard });
          continue;
        }

        if (!vCard.phone) {
          skippedContacts.push({ reason: 'No phone number', vCard });
          continue;
        }

        // Format phone to E.164
        const phone = formatPhoneForE164(vCard.phone);
        if (!phone) {
          skippedContacts.push({ reason: 'Invalid phone format', vCard });
          continue;
        }

        // Check if contact already exists FOR THIS USER
        // @ts-expect-error Mongoose typing issue with overloaded findOne() signatures
        const existingContact = await Contact.findOne({
          userId: session.user.id,
          phone
        });

        if (existingContact) {
          skippedContacts.push({ reason: 'Already exists', phone, vCard });
          continue;
        }

        // Create contact with userId
        // @ts-expect-error Mongoose typing issue with overloaded create() signatures
        const contact = await Contact.create({
          userId: session.user.id,
          firstName: vCard.firstName || 'Unknown',
          lastName: vCard.lastName || '',
          email: vCard.email,
          phone,
          address: vCard.address
            ? {
                street: vCard.address.street,
                city: vCard.address.city,
                state: vCard.address.state,
                zip: vCard.address.zip,
              }
            : undefined,
          source: 'vcard_import',
          status: 'new',
          tags: vCard.organization ? [vCard.organization] : [],
          preferences: {
            smsOptIn: false, // Default to false, user must manually opt-in
            emailOptIn: false,
            callOptIn: false,
          },
          notes: vCard.note || 'Imported from vCard file',
        });

        importedContacts.push(contact);
      } catch (error: any) {
        console.error('[vCard Import] Error processing contact:', error);
        errors.push({ vCard, error: error.message });
      }
    }

    console.log(`[vCard Import] Imported: ${importedContacts.length}, Skipped: ${skippedContacts.length}, Errors: ${errors.length}`);

    return NextResponse.json({
      success: true,
      imported: importedContacts.length,
      skipped: skippedContacts.length,
      errors: errors.length,
      contacts: importedContacts,
      details: {
        skippedReasons: skippedContacts.map((s) => s.reason),
        errorMessages: errors.map((e) => e.error),
      },
    });
  } catch (error: any) {
    console.error('[vCard Import] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ============================================================================
// vCard Parser
// ============================================================================

interface VCard {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  organization?: string;
  note?: string;
}

function parseVCards(vcfContent: string): VCard[] {
  const vCards: VCard[] = [];

  // Split by BEGIN:VCARD
  const vcardBlocks = vcfContent.split('BEGIN:VCARD').filter((block) => block.trim());

  for (const block of vcardBlocks) {
    const lines = block.split('\n').map((line) => line.trim()).filter((line) => line);

    const vCard: VCard = {};

    for (const line of lines) {
      // Parse FN (Full Name)
      if (line.startsWith('FN:')) {
        const fullName = line.substring(3);
        const parts = fullName.split(' ');
        vCard.firstName = parts[0];
        vCard.lastName = parts.slice(1).join(' ');
      }

      // Parse N (Structured Name)
      if (line.startsWith('N:')) {
        const nameParts = line.substring(2).split(';');
        vCard.lastName = nameParts[0] || vCard.lastName;
        vCard.firstName = nameParts[1] || vCard.firstName;
      }

      // Parse EMAIL
      if (line.includes('EMAIL')) {
        const emailMatch = line.match(/:(.*)/);
        if (emailMatch) {
          vCard.email = emailMatch[1];
        }
      }

      // Parse TEL (Phone)
      if (line.includes('TEL')) {
        const phoneMatch = line.match(/:(.*)/);
        if (phoneMatch && !vCard.phone) {
          // Get first phone number
          vCard.phone = phoneMatch[1];
        }
      }

      // Parse ADR (Address)
      if (line.includes('ADR')) {
        const adrMatch = line.match(/:(.*)/);
        if (adrMatch) {
          const adrParts = adrMatch[1].split(';');
          vCard.address = {
            street: adrParts[2] || undefined,
            city: adrParts[3] || undefined,
            state: adrParts[4] || undefined,
            zip: adrParts[5] || undefined,
          };
        }
      }

      // Parse ORG (Organization)
      if (line.startsWith('ORG:')) {
        vCard.organization = line.substring(4);
      }

      // Parse NOTE
      if (line.startsWith('NOTE:')) {
        vCard.note = line.substring(5);
      }
    }

    if (vCard.firstName || vCard.lastName) {
      vCards.push(vCard);
    }
  }

  return vCards;
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

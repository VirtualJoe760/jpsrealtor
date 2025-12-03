import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import User from '@/models/user';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const body = await req.json();
    const { email, phoneNumber, smsConsent, newsletterConsent } = body;

    // Validation
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (smsConsent && !phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required for SMS consent' },
        { status: 400 }
      );
    }

    // Get IP address from request headers
    const forwarded = req.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';

    // Find or create user
    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Create new user with consent
      user = new User({
        email: email.toLowerCase(),
        roles: ['endUser'],
      });
    }

    // Update SMS consent if provided
    if (smsConsent !== undefined) {
      user.smsConsent = {
        agreed: smsConsent,
        agreedAt: smsConsent ? new Date() : user.smsConsent?.agreedAt,
        phoneNumber: phoneNumber || user.smsConsent?.phoneNumber,
        ipAddress: ipAddress,
      };

      // Also update phone in user profile if provided
      if (phoneNumber && !user.phone) {
        user.phone = phoneNumber;
      }
    }

    // Update newsletter consent if provided
    if (newsletterConsent !== undefined) {
      user.newsletterConsent = {
        agreed: newsletterConsent,
        agreedAt: newsletterConsent ? new Date() : user.newsletterConsent?.agreedAt,
        email: email,
        ipAddress: ipAddress,
      };
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Consent preferences saved successfully',
      consents: {
        sms: user.smsConsent,
        newsletter: user.newsletterConsent,
      },
    });

  } catch (error: any) {
    console.error('Error saving consent:', error);
    return NextResponse.json(
      { error: 'Failed to save consent preferences', details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to check consent status
export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    const phoneNumber = searchParams.get('phoneNumber');

    if (!email && !phoneNumber) {
      return NextResponse.json(
        { error: 'Email or phone number is required' },
        { status: 400 }
      );
    }

    // Find user by email or phone
    const query: any = {};
    if (email) query.email = email.toLowerCase();
    if (phoneNumber && !email) query.phone = phoneNumber;

    const user = await User.findOne(query);

    if (!user) {
      return NextResponse.json({
        exists: false,
        consents: {
          sms: { agreed: false },
          newsletter: { agreed: false },
        },
      });
    }

    return NextResponse.json({
      exists: true,
      consents: {
        sms: user.smsConsent || { agreed: false },
        newsletter: user.newsletterConsent || { agreed: false },
      },
    });

  } catch (error: any) {
    console.error('Error fetching consent:', error);
    return NextResponse.json(
      { error: 'Failed to fetch consent status', details: error.message },
      { status: 500 }
    );
  }
}

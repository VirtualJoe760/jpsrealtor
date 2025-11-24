import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('payload-token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const payloadResponse = await fetch(`${process.env.NEXT_PUBLIC_CMS_URL}/api/users/me`, {
      headers: {
        'Authorization': `JWT ${token}`,
      },
    });

    if (!payloadResponse.ok) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { user } = await payloadResponse.json();
    return NextResponse.json({ user });
  } catch (error) {
    console.error('User fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

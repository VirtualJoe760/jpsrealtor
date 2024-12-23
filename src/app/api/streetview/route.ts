import { NextResponse } from 'next/server';
import { generateStreetViewUrls } from '@/app/utils/generateStreetViewUrls';

export async function GET() {
  const urls = generateStreetViewUrls();
  return NextResponse.json(urls);
}

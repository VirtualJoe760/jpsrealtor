import { NextResponse } from 'next/server';

export function GET() {
  const robots = `
User-agent: *
Allow: /

Disallow: /api/
Disallow: /private/
Disallow: /admin/

Sitemap: https://jpsrealtor.com/sitemap.xml
`;

  return new NextResponse(robots.trim(), {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}

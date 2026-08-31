import { NextResponse } from 'next/server';

const BODY = 'google-site-verification: google3ca31a5fa705ff79.html';

export function GET() {
  return new NextResponse(BODY, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}

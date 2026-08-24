import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isComingSoonExemptPath, isPublicComingSoonEnabled } from '@/lib/coming-soon';

export function middleware(request: NextRequest) {
  if (!isPublicComingSoonEnabled()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (isComingSoonExemptPath(pathname)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = '/coming-soon';
  url.search = '';
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};

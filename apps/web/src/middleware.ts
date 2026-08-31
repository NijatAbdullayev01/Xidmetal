import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  lookupCategorySlugById,
  lookupServiceCanonicalPath,
} from '@/lib/category-redirect';
import { isComingSoonExemptPath, isPublicComingSoonEnabled } from '@/lib/coming-soon';
import { isUuid, serviceTypeSlug } from '@xidmetal/shared';

function canonicalizeHostAndSlash(request: NextRequest): NextResponse | null {
  const url = request.nextUrl.clone();
  let changed = false;

  const hostname = url.hostname;
  if (hostname.startsWith('www.') && hostname !== 'www.localhost') {
    url.hostname = hostname.slice(4);
    changed = true;
  }

  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    changed = true;
  }

  if (!changed) return null;
  return NextResponse.redirect(url, 301);
}

function stripDefaultPageParam(request: NextRequest): NextResponse | null {
  if (request.nextUrl.searchParams.get('page') !== '1') return null;
  const url = request.nextUrl.clone();
  url.searchParams.delete('page');
  return NextResponse.redirect(url, 301);
}

export async function middleware(request: NextRequest) {
  const canonical = canonicalizeHostAndSlash(request);
  if (canonical) return canonical;

  const pageOne = stripDefaultPageParam(request);
  if (pageOne) return pageOne;

  const { pathname } = request.nextUrl;

  if (pathname === '/services') {
    const categoryId = request.nextUrl.searchParams.get('categoryId')?.trim();
    const query = request.nextUrl.searchParams.get('q')?.trim();
    if (categoryId && !query) {
      const slug = await lookupCategorySlugById(categoryId);
      if (slug) {
        const url = request.nextUrl.clone();
        url.pathname = `/categories/${slug}`;
        url.search = '';
        return NextResponse.redirect(url, 301);
      }
    }
  }

  const categoryMatch = pathname.match(/^\/categories\/([^/]+)$/);
  if (categoryMatch) {
    const type = request.nextUrl.searchParams.get('type')?.trim();
    if (type) {
      const url = request.nextUrl.clone();
      url.pathname = `/categories/${categoryMatch[1]}/type/${serviceTypeSlug(type)}`;
      url.search = '';
      return NextResponse.redirect(url, 301);
    }
  }

  const serviceMatch = pathname.match(/^\/services\/([^/]+)$/);
  if (serviceMatch) {
    const key = decodeURIComponent(serviceMatch[1] ?? '');
    if (isUuid(key)) {
      const canonicalPath = await lookupServiceCanonicalPath(key);
      if (canonicalPath && canonicalPath !== pathname) {
        const url = request.nextUrl.clone();
        url.pathname = canonicalPath;
        url.search = '';
        return NextResponse.redirect(url, 301);
      }
    }
  }

  if (!isPublicComingSoonEnabled()) {
    return NextResponse.next();
  }

  if (isComingSoonExemptPath(pathname)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = '/coming-soon';
  url.search = '';
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|google3ca31a5fa705ff79\\.html).*)'],
};

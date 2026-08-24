/** Canlı marketplace-də müvəqqəti «Tezliklə» ekranı. Dev/CI-də default sönülüdür. */
export function isPublicComingSoonEnabled(): boolean {
  const value = process.env.NEXT_PUBLIC_COMING_SOON?.trim().toLowerCase();
  return value === 'true' || value === '1';
}

export function isComingSoonExemptPath(pathname: string): boolean {
  if (
    pathname === '/favicon.ico' ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/sw.js' ||
    pathname === '/icon-192.png' ||
    pathname === '/icon-512.png' ||
    pathname === '/apple-touch-icon.png' ||
    pathname === '/apple-touch-icon-precomposed.png'
  ) {
    return true;
  }

  const prefixes = [
    '/coming-soon',
    '/dashboard',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/api',
    '/uploads',
    '/socket.io',
    '/_next',
  ];

  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

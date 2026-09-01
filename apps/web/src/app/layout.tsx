import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { AttentionProvider } from '@/components/providers/attention-provider';
import { AnalyticsProvider } from '@/components/analytics/analytics-provider';
import { NavigationProgress } from '@/components/layout/navigation-progress';
import { PwaRegister } from '@/components/pwa/pwa-register';
import { PwaInstallPrompt } from '@/components/pwa/pwa-install-prompt';
import { JsonLd } from '@/components/seo/json-ld';
import { buildOrganizationJsonLd, buildWebSiteJsonLd } from '@/lib/seo-schema';
import { getSiteUrl } from '@/lib/site-url';
import { APP, BRAND } from '@xidmetal/shared';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-inter',
});

const siteUrl = getSiteUrl();
const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || '';

export const viewport: Viewport = {
  themeColor: BRAND.primary,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: APP.name,
    template: `%s | ${APP.name}`,
  },
  description:
    'Xidmətal — Bakı və Azərbaycanda təmizlik, təmir, gözəllik, dezinfeksiya, nəqliyyat və çatdırılma. Etibarlı xidmət verənləri tapın və sifariş verin.',
  applicationName: APP.name,
  authors: [{ name: APP.name, url: siteUrl }],
  creator: APP.name,
  publisher: APP.name,
  keywords: [
    'xidmətal',
    'xidmət',
    'bakı xidmət',
    'təmizlik',
    'təmir',
    'gözəllik',
    'dezinfeksiya',
    'nəqliyyat',
    'çatdırılma',
    'xidmət verən',
    'xidmət alan',
    'sifariş',
  ],
  manifest: '/manifest.webmanifest',
  openGraph: {
    locale: 'az_AZ',
    type: 'website',
    siteName: APP.name,
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="az" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans">
        <JsonLd data={[buildOrganizationJsonLd(siteUrl), buildWebSiteJsonLd(siteUrl)]} />
        <ThemeProvider>
          <QueryProvider>
            <AttentionProvider>
              <AnalyticsProvider />
              <Suspense fallback={null}>
                <NavigationProgress />
              </Suspense>
              <PwaRegister />
              <PwaInstallPrompt />
              {children}
            </AttentionProvider>
          </QueryProvider>
        </ThemeProvider>
        {gaMeasurementId ? (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaMeasurementId}');`,
              }}
            />
          </>
        ) : null}
      </body>
    </html>
  );
}

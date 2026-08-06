import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { AttentionProvider } from '@/components/providers/attention-provider';
import { NavigationProgress } from '@/components/layout/navigation-progress';
import { APP } from '@xidmetal/shared';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: APP.name,
    template: `%s | ${APP.name}`,
  },
  description: APP.description,
  keywords: ['xidmət', 'xidmət verən', 'sifariş', 'azərbaycan', 'xidmət platforması'],
  openGraph: {
    title: APP.name,
    description: APP.description,
    locale: 'az_AZ',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="az" suppressHydrationWarning>
      <body className="font-sans">
        <ThemeProvider>
          <QueryProvider>
            <AttentionProvider>
              <Suspense fallback={null}>
                <NavigationProgress />
              </Suspense>
              {children}
            </AttentionProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

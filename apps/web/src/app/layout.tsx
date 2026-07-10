import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { APP } from '@xidmetal/shared';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: APP.name,
    template: `%s | ${APP.name}`,
  },
  description: APP.description,
  keywords: ['xidmət', 'provider', 'booking', 'azərbaycan', 'xidmət platforması'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="az" suppressHydrationWarning>
      <body className="font-sans">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-brand focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-brand-foreground"
      >
        Məzmuna keç
      </a>
      <Header />
      <main
        id="main-content"
        className="min-h-[calc(100dvh-3.5rem)] overflow-x-clip sm:min-h-[calc(100vh-4rem)]"
      >
        {children}
      </main>
      <Footer />
    </>
  );
}

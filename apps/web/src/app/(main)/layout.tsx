import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-[calc(100dvh-3.5rem)] overflow-x-clip sm:min-h-[calc(100vh-4rem)]">{children}</main>
      <Footer />
    </>
  );
}

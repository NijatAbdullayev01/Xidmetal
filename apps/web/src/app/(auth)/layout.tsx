export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[100dvh] overflow-y-auto overscroll-y-contain">
      {children}
    </main>
  );
}

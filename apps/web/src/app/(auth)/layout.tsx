export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex h-[100dvh] w-full flex-col overflow-hidden">
      {children}
    </main>
  );
}

export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-[100dvh] bg-tastelanc-bg text-white overflow-hidden">
      {children}
    </main>
  );
}

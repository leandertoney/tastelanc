export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-tastelanc-bg">
      {children}
    </div>
  );
}

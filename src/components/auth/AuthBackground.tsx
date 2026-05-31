type AuthBackgroundProps = {
  children: React.ReactNode;
};

export function AuthBackground({ children }: AuthBackgroundProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-blue-500 via-sky-500 to-indigo-600 px-4 py-10">
      <div className="absolute -left-20 top-12 h-56 w-56 rounded-full bg-white/15 blur-sm" />
      <div className="absolute right-10 top-20 h-28 w-28 rounded-full bg-cyan-200/25" />
      <div className="absolute bottom-10 left-1/3 h-40 w-40 rounded-full bg-blue-100/20" />
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </main>
  );
}

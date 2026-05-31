type AuthCardProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <section className="rounded-3xl bg-white/95 p-8 shadow-2xl shadow-blue-950/20 backdrop-blur">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold text-white shadow-lg shadow-blue-600/30">
        E
      </div>
      <div className="mt-5 text-center">
        <h1 className="text-2xl font-semibold text-slate-950">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
      </div>
      <div className="mt-7">{children}</div>
    </section>
  );
}

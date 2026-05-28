export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16 text-foreground">
      <section className="w-full max-w-3xl space-y-8">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            P0 Project Foundation
          </p>
          <h1 className="text-4xl font-semibold text-slate-950 sm:text-5xl">
            Next.js Agentic RAG Knowledge Base
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-600">
            This stage only initializes the App Router project foundation:
            TypeScript, Tailwind CSS, base folders, environment variable examples,
            and shared configuration helpers.
          </p>
        </div>

        <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="font-medium text-slate-950">App Router</div>
            <p className="mt-2">The home page is served from src/app/page.tsx.</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="font-medium text-slate-950">TypeScript</div>
            <p className="mt-2">Strict typing is enabled for project code.</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="font-medium text-slate-950">Tailwind CSS</div>
            <p className="mt-2">Utility classes are available globally.</p>
          </div>
        </div>
      </section>
    </main>
  );
}

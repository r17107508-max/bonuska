import { BrandMark } from "@/components/brand";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <section className="panel w-full max-w-md p-6">
        <BrandMark />
        <div className="mt-8">
          <h1 className="text-3xl font-semibold text-slate-950">{title}</h1>
          <p className="mt-2 text-slate-500">{subtitle}</p>
        </div>
        {children}
      </section>
    </main>
  );
}

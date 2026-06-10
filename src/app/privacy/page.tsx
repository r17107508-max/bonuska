import Link from "next/link";
import { BrandMark } from "@/components/brand";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const settings = await getSettings();

  return (
    <main className="min-h-screen bg-slate-100 py-8">
      <article className="page-shell max-w-4xl">
        <Link href="/" className="inline-block">
          <BrandMark />
        </Link>
        <section className="panel mt-8 p-6">
          <p className="badge bg-amber-100 text-amber-900">Версия {settings.privacyVersion}</p>
          <h1 className="mt-4 text-4xl font-semibold text-slate-950">Политика обработки персональных данных</h1>
          <div className="prose prose-slate mt-6 max-w-none whitespace-pre-wrap leading-7 text-slate-700">
            {settings.privacyText}
          </div>
        </section>
      </article>
    </main>
  );
}

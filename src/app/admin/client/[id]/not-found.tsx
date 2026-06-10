import Link from "next/link";

export default function ClientNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <section className="panel w-full max-w-md p-6 text-center">
        <h1 className="text-3xl font-semibold text-slate-950">Клиент не найден</h1>
        <p className="mt-2 text-slate-600">Проверьте QR-код или откройте список клиентов.</p>
        <Link href="/company/clients" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-700 px-4 font-semibold text-white">
          К списку клиентов
        </Link>
      </section>
    </main>
  );
}

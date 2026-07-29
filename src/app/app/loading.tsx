import { ClientShell } from "@/components/client-ui";

export default function ClientAppLoading() {
  return (
    <ClientShell>
      <div className="h-14 animate-pulse rounded-2xl bg-white" />
      <div className="space-y-3 rounded-3xl border border-[var(--border)] bg-white p-4 shadow-sm">
        <div className="h-6 w-2/3 animate-pulse rounded-full bg-[var(--inactive)]" />
        <div className="h-10 w-full animate-pulse rounded-full bg-[var(--inactive)]" />
        <div className="h-3 w-full animate-pulse rounded-full bg-[var(--inactive)]" />
        <div className="grid grid-cols-2 gap-2">
          <div className="h-12 animate-pulse rounded-2xl bg-[var(--inactive)]" />
          <div className="h-12 animate-pulse rounded-2xl bg-[var(--inactive)]" />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="h-28 animate-pulse rounded-3xl border border-[var(--border)] bg-white" />
        <div className="h-28 animate-pulse rounded-3xl border border-[var(--border)] bg-white" />
      </div>
    </ClientShell>
  );
}

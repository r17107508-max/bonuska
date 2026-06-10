import { LogOut } from "lucide-react";
import { logout } from "@/app/actions";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        <LogOut aria-hidden className="size-4" />
        Выйти
      </button>
    </form>
  );
}

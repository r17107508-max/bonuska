import { RaffleStatus } from "@prisma/client";
import { createCompanyRaffle, drawCompanyRaffle } from "@/app/actions";
import { AdminShell, companyNav } from "@/components/admin-shell";
import { SubmitButton } from "@/components/buttons";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { FormField } from "@/components/form-field";
import { requireCompanyAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import {
  MAX_RAFFLE_TICKETS,
  finalizeDueRafflesForCompany,
  formatKopeks,
  prizeTitleForPlace,
  raffleStatusClass,
  raffleStatusLabel,
  ticketWinningPlace,
} from "@/lib/raffles";

export default async function CompanyRafflesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const [access, params] = await Promise.all([requireCompanyAdmin(), searchParams]);
  await finalizeDueRafflesForCompany(access.companyId);

  const raffles = await getDb().companyRaffle.findMany({
    where: { companyId: access.companyId },
    include: {
      tickets: {
        include: {
          user: { select: { id: true, name: true, phone: true } },
          membership: { select: { id: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return (
    <AdminShell title="Розыгрыши" subtitle="Акции с розыгрышем призов поверх обычной программы лояльности." nav={companyNav}>
      {params.error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">{params.error}</p>}
      {params.success && <p className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{params.success}</p>}

      <form action={createCompanyRaffle} className="panel mb-6 grid gap-4 p-5">
        <div>
          <p className="text-xs font-semibold uppercase text-teal-700">Новый розыгрыш</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">Условия участия и призы</h2>
          <p className="mt-1 text-sm text-slate-600">Один клиент получает один трёхзначный номер в рамках одного розыгрыша.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Название" name="title" placeholder="Например, Розыгрыш кофемашины" />
          <FormField label="Минимальная сумма покупки, ₽" name="minPurchaseAmount" type="number" placeholder="500" />
          <FormField label="Участие до" name="participationEndsAt" type="datetime-local" />
          <FormField label="Дата розыгрыша" name="drawAt" type="datetime-local" />
          <FormField label="Приз за 1 место" name="firstPrizeTitle" placeholder="Главный приз" />
          <FormField label="Приз за 2 место" name="secondPrizeTitle" placeholder="Второй приз" />
          <FormField label="Приз за 3 место" name="thirdPrizeTitle" placeholder="Третий приз" />
        </div>
        <div className="rounded-lg bg-amber-50 p-4 text-sm leading-5 text-amber-950">
          Максимум участников при номерах 100-999: {MAX_RAFFLE_TICKETS}. Слово “лотерея” в интерфейсе не используется.
        </div>
        <SubmitButton>Создать розыгрыш</SubmitButton>
      </form>

      <section className="space-y-4">
        {raffles.map((raffle) => {
          const ticketsById = new Map(raffle.tickets.map((ticket) => [ticket.id, ticket]));
          const winners = [raffle.winner1TicketId, raffle.winner2TicketId, raffle.winner3TicketId]
            .map((ticketId, index) => {
              const ticket = ticketId ? ticketsById.get(ticketId) : null;
              return ticket ? { place: index + 1, ticket } : null;
            })
            .filter(Boolean);
          const canDraw = raffle.status !== RaffleStatus.DRAWN && raffle.status !== RaffleStatus.CANCELLED && raffle.drawAt <= new Date();

          return (
            <article key={raffle.id} className="panel overflow-hidden">
              <div className="grid gap-4 p-5 lg:grid-cols-[1fr_260px]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-slate-950">{raffle.title}</h2>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${raffleStatusClass(raffle.status)}`}>
                      {raffleStatusLabel(raffle.status)}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                    <p><span className="font-semibold text-slate-950">Порог:</span> {formatKopeks(raffle.minPurchaseAmountKopeks)}</p>
                    <p><span className="font-semibold text-slate-950">Участников:</span> {raffle.tickets.length}/{MAX_RAFFLE_TICKETS}</p>
                    <p><span className="font-semibold text-slate-950">Участие до:</span> {formatDateTime(raffle.participationEndsAt)}</p>
                    <p><span className="font-semibold text-slate-950">Розыгрыш:</span> {formatDateTime(raffle.drawAt)}</p>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                    <Prize place={1} title={raffle.firstPrizeTitle} />
                    <Prize place={2} title={raffle.secondPrizeTitle} />
                    <Prize place={3} title={raffle.thirdPrizeTitle} />
                  </div>
                </div>
                <div>
                  {canDraw ? (
                    <form action={drawCompanyRaffle}>
                      <input type="hidden" name="raffleId" value={raffle.id} />
                      <ConfirmSubmit
                        title="Зафиксировать победителей?"
                        confirmText="Победители будут выбраны на сервере один раз. После этого изменить результат через интерфейс нельзя."
                        buttonText="Зафиксировать победителей"
                      />
                    </form>
                  ) : (
                    <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                      {raffle.status === RaffleStatus.DRAWN
                        ? "Итоги уже зафиксированы."
                        : "Фиксация станет доступна после даты розыгрыша."}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-100 p-5">
                <h3 className="font-semibold text-slate-950">Победители</h3>
                {winners.length > 0 ? (
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    {winners.map((winner) => winner && (
                      <Winner key={winner.ticket.id} place={winner.place} ticket={winner.ticket} raffle={raffle} />
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    {raffle.status === RaffleStatus.DRAWN ? "Победителей нет: участников не было." : "Победители появятся после розыгрыша."}
                  </p>
                )}
              </div>
            </article>
          );
        })}

        {raffles.length === 0 && (
          <div className="panel p-5 text-sm text-slate-500">
            Розыгрышей пока нет. Создайте первый, чтобы кассиры начали выдавать номера при подходящей сумме покупки.
          </div>
        )}
      </section>
    </AdminShell>
  );
}

function Prize({ place, title }: { place: number; title: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase text-slate-500">{place} место</p>
      <p className="mt-1 font-semibold text-slate-950">{title}</p>
    </div>
  );
}

function Winner({
  place,
  ticket,
  raffle,
}: {
  place: number;
  ticket: {
    id: string;
    number: number;
    user: { name: string; phone: string };
    purchaseAmountKopeks: number;
  };
  raffle: {
    firstPrizeTitle: string;
    secondPrizeTitle: string;
    thirdPrizeTitle: string;
    winner1TicketId: string | null;
    winner2TicketId: string | null;
    winner3TicketId: string | null;
  };
}) {
  const resolvedPlace = ticketWinningPlace(ticket.id, raffle) ?? place;

  return (
    <div className="rounded-lg border border-teal-100 bg-teal-50 p-4 text-sm">
      <p className="text-xs font-bold uppercase text-teal-800">{resolvedPlace} место</p>
      <p className="mt-1 text-lg font-semibold text-slate-950">№ {ticket.number}</p>
      <p className="mt-1 font-semibold text-slate-950">{ticket.user.name}</p>
      <p className="text-slate-600">{ticket.user.phone}</p>
      <p className="mt-2 text-slate-700">{prizeTitleForPlace(resolvedPlace, raffle)}</p>
      <p className="mt-1 text-xs text-slate-500">Покупка: {formatKopeks(ticket.purchaseAmountKopeks)}</p>
    </div>
  );
}

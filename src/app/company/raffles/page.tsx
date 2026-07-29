import { RaffleStatus } from "@prisma/client";
import { createCompanyRaffle, deleteCompanyRaffle, drawCompanyRaffle, updateCompanyRaffle } from "@/app/actions";
import { AdminShell, companyNav } from "@/components/admin-shell";
import { SubmitButton } from "@/components/buttons";
import { EmptyCompanyState, StatusPill, WorkspaceCard, maskPhone } from "@/components/company-ui";
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
    <AdminShell title="Розыгрыши" subtitle="Акции с призами поверх существующей программы лояльности." nav={companyNav}>
      {params.error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-[var(--danger)]">{params.error}</p>}
      {params.success && <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{params.success}</p>}

      <div className="space-y-6">
        <section className="space-y-3">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-2xl font-extrabold text-[var(--text)]">Список розыгрышей</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Название, статус, участники, призы и победители в одном списке.</p>
            </div>
            <a href="#create-raffle" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--brand-strong)] px-4 text-sm font-bold text-white">
              Создать розыгрыш
            </a>
          </div>

          {raffles.length === 0 ? (
            <EmptyCompanyState
              image="empty-raffles"
              alt="Иллюстрация пустого списка розыгрышей"
              title="Розыгрышей пока нет"
              text="Создайте первый розыгрыш, чтобы клиенты получали номера участников после подходящих покупок."
              actionHref="#create-raffle"
              actionLabel="Создать розыгрыш"
            />
          ) : (
            <div className="grid gap-4">
              {raffles.map((raffle) => {
                const ticketsById = new Map(raffle.tickets.map((ticket) => [ticket.id, ticket]));
                const winners = [raffle.winner1TicketId, raffle.winner2TicketId, raffle.winner3TicketId]
                  .map((ticketId, index) => {
                    const ticket = ticketId ? ticketsById.get(ticketId) : null;
                    return ticket ? { place: index + 1, ticket } : null;
                  })
                  .filter(Boolean);
                const canDraw = raffle.status !== RaffleStatus.DRAWN && raffle.status !== RaffleStatus.CANCELLED && raffle.drawAt <= new Date();
                const canEdit = raffle.status !== RaffleStatus.DRAWN && raffle.status !== RaffleStatus.CANCELLED;
                const canDelete = raffle.status !== RaffleStatus.DRAWN;

                return (
                  <WorkspaceCard key={raffle.id} className="space-y-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-extrabold text-[var(--text)]">{raffle.title}</h3>
                          <StatusPill tone={raffleStatusTone(raffle.status)}>{raffleStatusText(raffle.status)}</StatusPill>
                        </div>
                        <div className="mt-3 grid gap-2 text-sm text-[var(--text-muted)] sm:grid-cols-2 xl:grid-cols-4">
                          <Info label="Период участия" value={`до ${formatDateTime(raffle.participationEndsAt)}`} />
                          <Info label="Дата розыгрыша" value={formatDateTime(raffle.drawAt)} />
                          <Info label="Участников" value={`${raffle.tickets.length}/${MAX_RAFFLE_TICKETS}`} />
                          <Info label="Порог покупки" value={formatKopeks(raffle.minPurchaseAmountKopeks)} />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row lg:w-64 lg:flex-col">
                        {canDraw && (
                          <form action={drawCompanyRaffle}>
                            <input type="hidden" name="raffleId" value={raffle.id} />
                            <ConfirmSubmit
                              title="Зафиксировать победителей?"
                              confirmText="Победители будут выбраны на сервере один раз. После этого изменить результат через интерфейс нельзя."
                              buttonText="Зафиксировать победителей"
                            />
                          </form>
                        )}
                        {canDelete && (
                          <form action={deleteCompanyRaffle}>
                            <input type="hidden" name="raffleId" value={raffle.id} />
                            <ConfirmSubmit
                              danger
                              title="Удалить розыгрыш?"
                              confirmText="Розыгрыш и уже выданные номера участников будут удалены. Это действие нельзя отменить."
                              buttonText="Удалить"
                              confirmButtonText="Удалить"
                            />
                          </form>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <Prize place={1} title={raffle.firstPrizeTitle} />
                      <Prize place={2} title={raffle.secondPrizeTitle} />
                      <Prize place={3} title={raffle.thirdPrizeTitle} />
                    </div>

                    <div className="rounded-xl border border-[var(--border)] bg-white p-4">
                      <h4 className="font-bold text-[var(--text)]">Победители</h4>
                      {winners.length > 0 ? (
                        <div className="mt-3 grid gap-3 md:grid-cols-3">
                          {winners.map((winner) => winner && (
                            <Winner key={winner.ticket.id} place={winner.place} ticket={winner.ticket} raffle={raffle} />
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-[var(--text-muted)]">
                          {raffle.status === RaffleStatus.DRAWN ? "Победителей нет: участников не было." : "Победители появятся после даты розыгрыша."}
                        </p>
                      )}
                    </div>

                    {canEdit && (
                      <details className="rounded-xl border border-[var(--border)] bg-white">
                        <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-[var(--text)]">Редактировать условия</summary>
                        <form action={updateCompanyRaffle} className="grid gap-4 border-t border-[var(--border)] p-4">
                          <input type="hidden" name="raffleId" value={raffle.id} />
                          <div className="grid gap-4 sm:grid-cols-2">
                            <FormField label="Название" name="title" defaultValue={raffle.title} />
                            <FormField label="Минимальная сумма покупки, ₽" name="minPurchaseAmount" type="number" step="0.01" defaultValue={formatKopeksForInput(raffle.minPurchaseAmountKopeks)} />
                            <FormField label="Участие до" name="participationEndsAt" type="datetime-local" defaultValue={formatDateTimeInput(raffle.participationEndsAt)} />
                            <FormField label="Дата розыгрыша" name="drawAt" type="datetime-local" defaultValue={formatDateTimeInput(raffle.drawAt)} />
                            <FormField label="Приз за 1 место" name="firstPrizeTitle" defaultValue={raffle.firstPrizeTitle} />
                            <FormField label="Приз за 2 место" name="secondPrizeTitle" defaultValue={raffle.secondPrizeTitle} />
                            <FormField label="Приз за 3 место" name="thirdPrizeTitle" defaultValue={raffle.thirdPrizeTitle} />
                          </div>
                          <SubmitButton variant="secondary">Сохранить изменения</SubmitButton>
                        </form>
                      </details>
                    )}
                  </WorkspaceCard>
                );
              })}
            </div>
          )}
        </section>

        <WorkspaceCard id="create-raffle">
          <form action={createCompanyRaffle} className="grid gap-6">
            <div>
              <p className="text-xs font-bold uppercase text-[var(--brand-strong)]">Новый розыгрыш</p>
              <h2 className="mt-1 text-2xl font-extrabold text-[var(--text)]">Создание в три шага</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Проверка последовательности дат выполняется сервером при сохранении.</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Step title="1. Условия участия">
                <FormField label="Название" name="title" placeholder="Например, Розыгрыш кофемашины" />
                <FormField label="Минимальная сумма покупки, ₽" name="minPurchaseAmount" type="number" step="0.01" placeholder="500" />
                <p className="text-xs font-semibold text-[var(--text-muted)]">Максимум участников: {MAX_RAFFLE_TICKETS} номеров.</p>
              </Step>

              <Step title="2. Призы и даты">
                <FormField label="Участие до" name="participationEndsAt" type="datetime-local" />
                <FormField label="Дата и время розыгрыша" name="drawAt" type="datetime-local" />
                <FormField label="Приз за 1 место" name="firstPrizeTitle" placeholder="Главный приз" />
                <FormField label="Приз за 2 место" name="secondPrizeTitle" placeholder="Второй приз" />
                <FormField label="Приз за 3 место" name="thirdPrizeTitle" placeholder="Третий приз" />
              </Step>

              <Step title="3. Проверка и публикация">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 text-sm text-[var(--text-muted)]">
                  <p className="font-bold text-[var(--text)]">Перед публикацией проверьте:</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>сумму покупки для участия;</li>
                    <li>дату окончания приёма заявок;</li>
                    <li>дату фиксации победителей;</li>
                    <li>названия трёх призов.</li>
                  </ul>
                </div>
                <SubmitButton>Создать розыгрыш</SubmitButton>
              </Step>
            </div>
          </form>
        </WorkspaceCard>
      </div>
    </AdminShell>
  );
}

function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-4">
      <h3 className="text-lg font-extrabold text-[var(--text)]">{title}</h3>
      <div className="mt-4 grid gap-4">{children}</div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="font-bold text-[var(--text)]">{label}:</span> {value}
    </p>
  );
}

function Prize({ place, title }: { place: number; title: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
      <p className="text-xs font-bold uppercase text-[var(--text-muted)]">{place} место</p>
      <p className="mt-1 font-bold text-[var(--text)]">{title}</p>
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
    <div className="rounded-xl border border-[rgba(201,71,38,0.2)] bg-[var(--brand-soft)] p-4 text-sm">
      <p className="text-xs font-bold uppercase text-[var(--brand-strong)]">{resolvedPlace} место</p>
      <p className="mt-1 text-lg font-extrabold text-[var(--text)]">№ {ticket.number}</p>
      <p className="mt-1 font-bold text-[var(--text)]">{ticket.user.name}</p>
      <p className="text-[var(--text-muted)]">{maskPhone(ticket.user.phone)}</p>
      <p className="mt-2 text-[var(--text)]">{prizeTitleForPlace(resolvedPlace, raffle)}</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">Покупка: {formatKopeks(ticket.purchaseAmountKopeks)}</p>
    </div>
  );
}

function raffleStatusText(status: RaffleStatus) {
  const labels: Record<RaffleStatus, string> = {
    DRAFT: "Черновик",
    ACTIVE: "Идёт",
    CLOSED: "Приём завершён",
    DRAWN: "Победители определены",
    CANCELLED: "Отменён",
  };

  return labels[status];
}

function raffleStatusTone(status: RaffleStatus): "neutral" | "success" | "warning" | "danger" | "brand" {
  if (status === RaffleStatus.ACTIVE) return "success";
  if (status === RaffleStatus.CLOSED) return "warning";
  if (status === RaffleStatus.DRAWN) return "brand";
  if (status === RaffleStatus.CANCELLED) return "danger";
  return "neutral";
}

function formatKopeksForInput(kopeks: number) {
  const rubles = kopeks / 100;
  return Number.isInteger(rubles) ? String(rubles) : rubles.toFixed(2);
}

function formatDateTimeInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");

  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  ].join("T");
}

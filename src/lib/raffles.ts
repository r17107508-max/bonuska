import { randomInt } from "node:crypto";
import { Prisma, RaffleStatus, type CompanyRaffle, type RaffleTicket } from "@prisma/client";
import { getDb } from "@/lib/db";

export const MIN_RAFFLE_NUMBER = 100;
export const MAX_RAFFLE_NUMBER = 999;
export const MAX_RAFFLE_TICKETS = MAX_RAFFLE_NUMBER - MIN_RAFFLE_NUMBER + 1;

export function parseRublesToKopeks(value: FormDataEntryValue | string | null | undefined) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".");

  if (!normalized) {
    return 0;
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) {
    return 0;
  }

  return Math.round(amount * 100);
}

export function formatKopeks(kopeks: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: kopeks % 100 === 0 ? 0 : 2,
  }).format(kopeks / 100);
}

export function raffleStatusLabel(status: RaffleStatus) {
  const labels: Record<RaffleStatus, string> = {
    DRAFT: "Черновик",
    ACTIVE: "Активен",
    CLOSED: "Приём завершён",
    DRAWN: "Победители определены",
    CANCELLED: "Отменён",
  };

  return labels[status];
}

export function raffleStatusClass(status: RaffleStatus) {
  const classes: Record<RaffleStatus, string> = {
    DRAFT: "bg-slate-100 text-slate-700",
    ACTIVE: "bg-emerald-100 text-emerald-800",
    CLOSED: "bg-amber-100 text-amber-900",
    DRAWN: "bg-teal-100 text-teal-800",
    CANCELLED: "bg-red-100 text-red-800",
  };

  return classes[status];
}

export function ticketWinningPlace(
  ticketId: string,
  raffle: Pick<CompanyRaffle, "winner1TicketId" | "winner2TicketId" | "winner3TicketId">,
) {
  if (raffle.winner1TicketId === ticketId) return 1;
  if (raffle.winner2TicketId === ticketId) return 2;
  if (raffle.winner3TicketId === ticketId) return 3;
  return null;
}

export function prizeTitleForPlace(
  place: number,
  raffle: Pick<CompanyRaffle, "firstPrizeTitle" | "secondPrizeTitle" | "thirdPrizeTitle">,
) {
  if (place === 1) return raffle.firstPrizeTitle;
  if (place === 2) return raffle.secondPrizeTitle;
  if (place === 3) return raffle.thirdPrizeTitle;
  return "";
}

export async function getActiveCompanyRaffle(companyId: string) {
  await finalizeDueRafflesForCompany(companyId);
  const now = new Date();

  return getDb().companyRaffle.findFirst({
    where: {
      companyId,
      status: RaffleStatus.ACTIVE,
      participationEndsAt: { gte: now },
      drawAt: { gt: now },
    },
    orderBy: [{ participationEndsAt: "asc" }, { createdAt: "desc" }],
  });
}

export async function finalizeDueRafflesForCompany(companyId: string) {
  const now = new Date();
  const due = await getDb().companyRaffle.findMany({
    where: {
      companyId,
      status: { in: [RaffleStatus.ACTIVE, RaffleStatus.CLOSED] },
      drawAt: { lte: now },
    },
    select: { id: true },
  });

  await Promise.all(due.map((raffle) => finalizeRaffle(raffle.id)));
}

export async function finalizeDueRafflesForUser(userId: string) {
  const now = new Date();
  const due = await getDb().companyRaffle.findMany({
    where: {
      status: { in: [RaffleStatus.ACTIVE, RaffleStatus.CLOSED] },
      drawAt: { lte: now },
      tickets: { some: { userId } },
    },
    select: { id: true },
  });

  await Promise.all(due.map((raffle) => finalizeRaffle(raffle.id)));
}

export async function finalizeRaffle(raffleId: string) {
  return getDb().$transaction(async (tx) => finalizeRaffleInTransaction(tx, raffleId));
}

export async function finalizeRaffleInTransaction(tx: Prisma.TransactionClient, raffleId: string) {
  const now = new Date();
  const claimed = await tx.companyRaffle.updateMany({
    where: {
      id: raffleId,
      status: { in: [RaffleStatus.ACTIVE, RaffleStatus.CLOSED] },
      drawAt: { lte: now },
    },
    data: { status: RaffleStatus.CLOSED },
  });

  const raffle = await tx.companyRaffle.findUnique({
    where: { id: raffleId },
  });

  if (!raffle) {
    return null;
  }

  if (claimed.count === 0 && raffle.status === RaffleStatus.DRAWN) {
    return raffle;
  }

  if (claimed.count === 0) {
    return raffle;
  }

  const tickets = await tx.raffleTicket.findMany({
    where: { raffleId },
    select: { id: true },
  });
  const winners = shuffle(tickets).slice(0, 3);

  return tx.companyRaffle.update({
    where: { id: raffleId },
    data: {
      status: RaffleStatus.DRAWN,
      winner1TicketId: winners[0]?.id ?? null,
      winner2TicketId: winners[1]?.id ?? null,
      winner3TicketId: winners[2]?.id ?? null,
      company: {
        update: {
          auditLogs: {
            create: {
              action: "RAFFLE_DRAWN",
              entityType: "CompanyRaffle",
              entityId: raffleId,
              metadataJson: JSON.stringify({
                tickets: tickets.length,
                winner1TicketId: winners[0]?.id ?? null,
                winner2TicketId: winners[1]?.id ?? null,
                winner3TicketId: winners[2]?.id ?? null,
              }),
            },
          },
        },
      },
    },
  });
}

export async function issueRaffleTicketForPurchase(
  tx: Prisma.TransactionClient,
  {
    companyId,
    membershipId,
    userId,
    purchaseAmountKopeks,
  }: {
    companyId: string;
    membershipId: string;
    userId: string;
    purchaseAmountKopeks: number;
  },
) {
  if (purchaseAmountKopeks <= 0) {
    return null;
  }

  const now = new Date();
  const raffle = await tx.companyRaffle.findFirst({
    where: {
      companyId,
      status: RaffleStatus.ACTIVE,
      participationEndsAt: { gte: now },
      drawAt: { gt: now },
      minPurchaseAmountKopeks: { lte: purchaseAmountKopeks },
    },
    orderBy: [{ participationEndsAt: "asc" }, { createdAt: "desc" }],
  });

  if (!raffle) {
    return null;
  }

  const existing = await tx.raffleTicket.findUnique({
    where: { raffleId_membershipId: { raffleId: raffle.id, membershipId } },
    include: { raffle: true },
  });

  if (existing) {
    return existing;
  }

  const number = await nextTicketNumber(tx, raffle.id);
  if (!number) {
    throw new Error("В этом розыгрыше уже заняты все трёхзначные номера");
  }

  return tx.raffleTicket.create({
    data: {
      raffleId: raffle.id,
      companyId,
      membershipId,
      userId,
      number,
      purchaseAmountKopeks,
    },
    include: { raffle: true },
  });
}

async function nextTicketNumber(tx: Prisma.TransactionClient, raffleId: string) {
  const tickets = await tx.raffleTicket.findMany({
    where: { raffleId },
    select: { number: true },
  });

  if (tickets.length >= MAX_RAFFLE_TICKETS) {
    return null;
  }

  const used = new Set(tickets.map((ticket) => ticket.number));
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const candidate = randomInt(MIN_RAFFLE_NUMBER, MAX_RAFFLE_NUMBER + 1);
    if (!used.has(candidate)) {
      return candidate;
    }
  }

  for (let candidate = MIN_RAFFLE_NUMBER; candidate <= MAX_RAFFLE_NUMBER; candidate += 1) {
    if (!used.has(candidate)) {
      return candidate;
    }
  }

  return null;
}

function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export type RaffleTicketWithRaffle = RaffleTicket & { raffle: CompanyRaffle };

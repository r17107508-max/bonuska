import { randomUUID } from "node:crypto";
import {
  CompanyStatus,
  LoyaltyProgramType,
  LoyaltyTransactionType,
  Prisma,
  type CustomerMembership,
  type GiftOption,
  type LoyaltyProgram,
} from "@prisma/client";
import { getDb } from "@/lib/db";

const REPEAT_GUARD_MS = 30_000;

export function leftToReward(membership: Pick<CustomerMembership, "currentCount" | "rewardAvailable">, goalCount: number) {
  if (membership.rewardAvailable) {
    return 0;
  }

  return Math.max(goalCount - membership.currentCount, 0);
}

export function buildQrPayload(token: string) {
  return `tega:${token}`;
}

export function normalizeQrToken(value: string) {
  return decodeURIComponent(value).trim().replace(/^tega:/i, "");
}

export async function refreshCompanySubscription(companyId: string) {
  const db = getDb();
  const company = await db.company.findUnique({ where: { id: companyId } });

  if (!company) {
    return null;
  }

  const now = new Date();
  if (company.status === CompanyStatus.ACTIVE_TRIAL && company.trialEndsAt && company.trialEndsAt <= now) {
    return db.company.update({
      where: { id: company.id },
      data: { status: CompanyStatus.PAYMENT_REQUIRED },
    });
  }

  if (company.status === CompanyStatus.ACTIVE_PAID && company.paidUntil && company.paidUntil <= now) {
    return db.company.update({
      where: { id: company.id },
      data: { status: CompanyStatus.PAYMENT_REQUIRED },
    });
  }

  return company;
}

export function hasActiveAccess(status: CompanyStatus, trialEndsAt: Date | null, paidUntil: Date | null) {
  const now = new Date();
  if (status === CompanyStatus.ACTIVE_TRIAL) {
    return Boolean(trialEndsAt && trialEndsAt > now);
  }
  if (status === CompanyStatus.ACTIVE_PAID) {
    return Boolean(paidUntil && paidUntil > now);
  }
  return false;
}

function chooseGift(options: GiftOption[]) {
  const active = options.filter((option) => option.isActive);
  if (active.length === 0) {
    return null;
  }

  const total = active.reduce((sum, option) => sum + Math.max(1, option.probabilityWeight), 0);
  let roll = Math.floor(Math.random() * total);

  for (const option of active) {
    roll -= Math.max(1, option.probabilityWeight);
    if (roll < 0) {
      return option;
    }
  }

  return active[0] ?? null;
}

function rewardTitle(program: LoyaltyProgram, giftOptions: GiftOption[]) {
  if (program.programType === LoyaltyProgramType.GIFT_BOX) {
    const gift = chooseGift(giftOptions);
    return gift?.title ?? program.rewardTitle;
  }

  return program.rewardTitle;
}

export async function findMembershipForScan(companyId: string, token: string) {
  return getDb().customerMembership.findFirst({
    where: {
      companyId,
      qrToken: normalizeQrToken(token),
    },
    include: {
      user: true,
      company: { include: { loyaltyProgram: true } },
      transactions: {
        include: { cashier: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
}

export async function addPurchase(companyId: string, membershipId: string, cashierId: string) {
  return getDb().$transaction(async (tx: Prisma.TransactionClient) => {
    const membership = await tx.customerMembership.findFirst({
      where: { id: membershipId, companyId },
      include: {
        company: { include: { loyaltyProgram: true, giftOptions: true } },
      },
    });

    if (!membership || !membership.company.loyaltyProgram) {
      throw new Error("Клиент или программа лояльности не найдены");
    }

    const company = await refreshCompanyInTransaction(tx, companyId);
    if (!company || !hasActiveAccess(company.status, company.trialEndsAt, company.paidUntil)) {
      throw new Error("Сервис компании временно недоступен из-за статуса подписки");
    }

    if (membership.rewardAvailable) {
      throw new Error("Сначала выдайте доступный подарок");
    }

    if (membership.lastActionAt && Date.now() - membership.lastActionAt.getTime() < REPEAT_GUARD_MS) {
      throw new Error("Повторное начисление этому клиенту доступно через 30 секунд");
    }

    const program = membership.company.loyaltyProgram;
    const countBefore = membership.currentCount;
    const countAfter = countBefore + 1;
    const rewardAvailable = countAfter >= program.goalCount;
    const pendingReward = rewardAvailable ? rewardTitle(program, membership.company.giftOptions) : null;

    await tx.customerMembership.update({
      where: { id: membership.id },
      data: {
        currentCount: countAfter,
        totalPurchases: { increment: 1 },
        rewardAvailable,
        pendingReward,
        lastActionAt: new Date(),
      },
    });

    await tx.loyaltyTransaction.create({
      data: {
        companyId,
        membershipId,
        cashierId,
        type: LoyaltyTransactionType.PURCHASE,
        countBefore,
        countAfter,
        rewardTitle: pendingReward,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: cashierId,
        companyId,
        action: "LOYALTY_PURCHASE",
        entityType: "CustomerMembership",
        entityId: membershipId,
        metadataJson: JSON.stringify({ countBefore, countAfter, rewardAvailable }),
      },
    });
  });
}

export async function grantReward(companyId: string, membershipId: string, cashierId: string) {
  return getDb().$transaction(async (tx: Prisma.TransactionClient) => {
    const membership = await tx.customerMembership.findFirst({
      where: { id: membershipId, companyId },
      include: {
        company: { include: { loyaltyProgram: true } },
      },
    });

    if (!membership || !membership.company.loyaltyProgram) {
      throw new Error("Клиент или программа лояльности не найдены");
    }

    const company = await refreshCompanyInTransaction(tx, companyId);
    if (!company || !hasActiveAccess(company.status, company.trialEndsAt, company.paidUntil)) {
      throw new Error("Сервис компании временно недоступен из-за статуса подписки");
    }

    if (!membership.rewardAvailable) {
      throw new Error("Подарок пока недоступен");
    }

    const countBefore = membership.currentCount;
    const title = membership.pendingReward ?? membership.company.loyaltyProgram.rewardTitle;

    await tx.customerMembership.update({
      where: { id: membership.id },
      data: {
        currentCount: 0,
        rewardAvailable: false,
        pendingReward: null,
        totalRewards: { increment: 1 },
        lastActionAt: new Date(),
      },
    });

    await tx.loyaltyTransaction.create({
      data: {
        companyId,
        membershipId,
        cashierId,
        type: LoyaltyTransactionType.REWARD_GRANTED,
        countBefore,
        countAfter: 0,
        rewardTitle: title,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: cashierId,
        companyId,
        action: "LOYALTY_REWARD_GRANTED",
        entityType: "CustomerMembership",
        entityId: membershipId,
        metadataJson: JSON.stringify({ rewardTitle: title }),
      },
    });
  });
}

async function refreshCompanyInTransaction(tx: Prisma.TransactionClient, companyId: string) {
  const company = await tx.company.findUnique({ where: { id: companyId } });
  if (!company) {
    return null;
  }

  const now = new Date();
  if (company.status === CompanyStatus.ACTIVE_TRIAL && company.trialEndsAt && company.trialEndsAt <= now) {
    return tx.company.update({
      where: { id: companyId },
      data: { status: CompanyStatus.PAYMENT_REQUIRED },
    });
  }

  if (company.status === CompanyStatus.ACTIVE_PAID && company.paidUntil && company.paidUntil <= now) {
    return tx.company.update({
      where: { id: companyId },
      data: { status: CompanyStatus.PAYMENT_REQUIRED },
    });
  }

  return company;
}

export function newQrToken() {
  return randomUUID();
}

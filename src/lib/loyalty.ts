import { randomUUID } from "node:crypto";
import {
  CompanyStatus,
  LoyaltyProgramType,
  LoyaltyTransactionType,
  Prisma,
  RewardClaimStatus,
  type CustomerMembership,
  type GiftOption,
  type LoyaltyProgram,
  type User,
} from "@prisma/client";
import { getDb } from "@/lib/db";
import { verifyDynamicCustomerQr } from "@/lib/dynamic-qr";

export const REPEAT_GUARD_SECONDS = 30;
export const DAILY_PURCHASE_LIMIT_PER_CUSTOMER = 5;
const REPEAT_GUARD_MS = REPEAT_GUARD_SECONDS * 1_000;
const REPEAT_GUARD_MESSAGE = `Повторное начисление этому клиенту доступно через ${REPEAT_GUARD_SECONDS} секунд`;
const DAILY_LIMIT_MESSAGE = `Дневной лимит начислений этому клиенту исчерпан: максимум ${DAILY_PURCHASE_LIMIT_PER_CUSTOMER} покупок в день`;
const SELF_OPERATION_MESSAGE = "Кассир не может начислять покупки или выдавать подарки самому себе";

export type SuspiciousLoyaltyReason = "repeat_purchase_guard" | "daily_purchase_limit" | "cashier_self_operation";

const suspiciousMessages: Record<SuspiciousLoyaltyReason, string> = {
  repeat_purchase_guard: REPEAT_GUARD_MESSAGE,
  daily_purchase_limit: DAILY_LIMIT_MESSAGE,
  cashier_self_operation: SELF_OPERATION_MESSAGE,
};

export function leftToReward(membership: Pick<CustomerMembership, "currentCount" | "rewardAvailable">, goalCount: number) {
  if (membership.rewardAvailable) {
    return 0;
  }

  return Math.max(goalCount - membership.currentCount, 0);
}

export function buildQrPayload(token: string) {
  return `tega:${token}`;
}

export function buildGlobalQrPayload(token: string) {
  return `proplushki:user:${token}`;
}

export function buildRewardQrPayload(token: string) {
  return `proplushki:reward:${token}`;
}

export function normalizeQrToken(value: string) {
  return decodeURIComponent(value).trim().replace(/^tega:/i, "");
}

function parseScanPayload(value: string) {
  const normalized = decodeURIComponent(value).trim();

  if (normalized.toLowerCase().startsWith("tega:")) {
    return { type: "membership" as const, token: normalized.replace(/^tega:/i, "") };
  }

  if (normalized.toLowerCase().startsWith("proplushki:user:")) {
    return { type: "globalUser" as const, token: normalized.replace(/^proplushki:user:/i, "") };
  }

  if (normalized.toLowerCase().startsWith("proplushki:session:")) {
    return { type: "dynamicUser" as const, token: normalized.replace(/^proplushki:session:/i, "") };
  }

  if (normalized.toLowerCase().startsWith("proplushki:reward:")) {
    return { type: "rewardClaim" as const, token: normalized.replace(/^proplushki:reward:/i, "") };
  }

  return { type: "unknown" as const, token: normalized };
}

export function normalizeScanToken(value: string) {
  return decodeURIComponent(value).trim();
}

export function normalizeRewardClaimToken(value: string) {
  const parsed = parseScanPayload(value);
  return parsed.type === "rewardClaim" ? parsed.token : decodeURIComponent(value).trim();
}

export async function refreshCompanySubscription(companyId: string) {
  const db = getDb();
  const company = await db.company.findUnique({ where: { id: companyId } });

  if (!company) {
    return null;
  }

  if (company.status === CompanyStatus.DELETED) {
    return company;
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

export function isGiftBoxProgram(
  program: Pick<LoyaltyProgram, "programType" | "isGiftBoxEnabled">,
  giftOptions: Pick<GiftOption, "isActive">[] = [],
) {
  return program.programType === LoyaltyProgramType.GIFT_BOX || program.isGiftBoxEnabled || giftOptions.some((gift) => gift.isActive);
}

function rewardTitle(program: LoyaltyProgram, giftOptions: GiftOption[]) {
  if (isGiftBoxProgram(program, giftOptions)) {
    const gift = chooseGift(giftOptions);
    return gift?.title ?? program.rewardTitle;
  }

  return program.rewardTitle;
}

export async function findMembershipForScan(companyId: string, token: string) {
  const parsed = parseScanPayload(token);

  if (parsed.type === "rewardClaim") {
    return null;
  }

  if (parsed.type === "globalUser") {
    return findMembershipByGlobalToken(companyId, parsed.token);
  }

  if (parsed.type === "dynamicUser") {
    return findMembershipByDynamicToken(companyId, parsed.token);
  }

  const membership = await getDb().customerMembership.findFirst({
    where: {
      companyId,
      qrToken: parsed.token,
      company: { status: { not: CompanyStatus.DELETED } },
    },
    include: {
      user: true,
      company: { include: { loyaltyProgram: true, giftOptions: true } },
      transactions: {
        include: { cashier: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (membership || parsed.type === "membership") {
    return membership;
  }

  return findMembershipByGlobalToken(companyId, parsed.token);
}

async function findMembershipByGlobalToken(companyId: string, globalQrToken: string) {
  const user = await getDb().user.findUnique({
    where: { globalQrToken },
    select: { id: true },
  });

  if (!user) {
    return null;
  }

  return getDb().customerMembership.findFirst({
    where: {
      companyId,
      userId: user.id,
      company: { status: { not: CompanyStatus.DELETED } },
    },
    include: {
      user: true,
      company: { include: { loyaltyProgram: true, giftOptions: true } },
      transactions: {
        include: { cashier: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
}

async function findMembershipByDynamicToken(companyId: string, dynamicToken: string) {
  const userId = await verifyDynamicCustomerQr(dynamicToken);
  if (!userId) {
    return null;
  }

  return getDb().customerMembership.findFirst({
    where: {
      companyId,
      userId,
      company: { status: { not: CompanyStatus.DELETED } },
    },
    include: {
      user: true,
      company: { include: { loyaltyProgram: true, giftOptions: true } },
      transactions: {
        include: { cashier: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
}

export async function findCustomerForGlobalScan(companyId: string, token: string) {
  const parsed = parseScanPayload(token);
  let user: { id: string; name: string; phone: string } | null = null;

  if (parsed.type === "dynamicUser") {
    const userId = await verifyDynamicCustomerQr(parsed.token);
    user = userId
      ? await getDb().user.findUnique({
          where: { id: userId },
          select: { id: true, name: true, phone: true },
        })
      : null;
  } else {
    const globalQrToken = parsed.type === "globalUser" ? parsed.token : parsed.type === "unknown" ? parsed.token : null;
    user = globalQrToken
      ? await getDb().user.findUnique({
          where: { globalQrToken },
          select: { id: true, name: true, phone: true },
        })
      : null;
  }

  if (!user) {
    return null;
  }

  const membership = await getDb().customerMembership.findFirst({
    where: { companyId, userId: user.id, company: { status: { not: CompanyStatus.DELETED } } },
    select: { id: true },
  });

  return membership ? null : user;
}

export async function joinCompanyProgram(companyId: string, userId: string, actorUserId?: string | null) {
  const db = getDb();
  const company = await refreshCompanySubscription(companyId);
  if (!company || !hasActiveAccess(company.status, company.trialEndsAt, company.paidUntil)) {
    throw new Error("Компания сейчас недоступна для участия");
  }

  const membership = await db.customerMembership.upsert({
    where: { companyId_userId: { companyId, userId } },
    update: {},
    create: {
      companyId,
      userId,
      qrToken: newQrToken(),
    },
  });

  await db.auditLog.create({
    data: {
      actorUserId: actorUserId ?? userId,
      companyId,
      action: "CUSTOMER_MEMBERSHIP_JOINED",
      entityType: "CustomerMembership",
      entityId: membership.id,
      metadataJson: JSON.stringify({ userId, joinedBy: actorUserId ? "cashier" : "customer" }),
    },
  });

  return membership;
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

    if (membership.userId === cashierId) {
      throw new Error(SELF_OPERATION_MESSAGE);
    }

    if (membership.rewardAvailable) {
      throw new Error("Сначала выдайте доступный подарок");
    }

    if (membership.lastActionAt && Date.now() - membership.lastActionAt.getTime() < REPEAT_GUARD_MS) {
      throw new Error(REPEAT_GUARD_MESSAGE);
    }

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const purchasesToday = await tx.loyaltyTransaction.count({
      where: {
        companyId,
        membershipId,
        type: LoyaltyTransactionType.PURCHASE,
        createdAt: { gte: dayStart },
      },
    });

    if (purchasesToday >= DAILY_PURCHASE_LIMIT_PER_CUSTOMER) {
      throw new Error(DAILY_LIMIT_MESSAGE);
    }

    const program = membership.company.loyaltyProgram;
    const countBefore = membership.currentCount;
    const countAfter = countBefore + 1;
    const rewardAvailable = countAfter >= program.goalCount;
    const isGiftBox = isGiftBoxProgram(program, membership.company.giftOptions);
    const pendingReward = rewardAvailable && !isGiftBox ? rewardTitle(program, membership.company.giftOptions) : null;

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

    if (rewardAvailable && isGiftBox) {
      const existingClaim = await tx.rewardClaim.findFirst({
        where: {
          membershipId: membership.id,
          status: { in: [RewardClaimStatus.AVAILABLE, RewardClaimStatus.OPENED] },
        },
        select: { id: true },
      });

      if (!existingClaim) {
        await tx.rewardClaim.create({
          data: {
            companyId,
            membershipId,
            userId: membership.userId,
            token: newRewardToken(),
            status: RewardClaimStatus.AVAILABLE,
          },
        });
      }
    }

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

export async function openRewardClaimForCustomer(userId: string, membershipId: string) {
  return getDb().$transaction(async (tx: Prisma.TransactionClient) => {
    const membership = await tx.customerMembership.findFirst({
      where: { id: membershipId, userId },
      include: {
        company: { include: { loyaltyProgram: true, giftOptions: true } },
      },
    });

    if (!membership || !membership.company.loyaltyProgram) {
      throw new Error("Карта или программа лояльности не найдены");
    }

    const company = await refreshCompanyInTransaction(tx, membership.companyId);
    if (!company || !hasActiveAccess(company.status, company.trialEndsAt, company.paidUntil)) {
      throw new Error("Компания сейчас недоступна");
    }

    const program = membership.company.loyaltyProgram;
    const isGiftBox = isGiftBoxProgram(program, membership.company.giftOptions);
    if (!isGiftBox) {
      throw new Error("Для этой компании не включена случайная коробка подарков");
    }

    if (!membership.rewardAvailable) {
      throw new Error("Подарок пока не доступен");
    }

    const existingOpened = await tx.rewardClaim.findFirst({
      where: { membershipId: membership.id, status: RewardClaimStatus.OPENED },
      include: { giftOption: true },
      orderBy: { openedAt: "desc" },
    });

    if (existingOpened) {
      return existingOpened;
    }

    const activeGifts = membership.company.giftOptions.filter((gift) => gift.isActive);
    if (activeGifts.length === 0) {
      throw new Error("У компании пока нет активных подарков для коробки");
    }

    const claim =
      (await tx.rewardClaim.findFirst({
        where: { membershipId: membership.id, status: RewardClaimStatus.AVAILABLE },
        orderBy: { createdAt: "asc" },
      })) ??
      (await tx.rewardClaim.create({
        data: {
          companyId: membership.companyId,
          membershipId: membership.id,
          userId: membership.userId,
          token: newRewardToken(),
          status: RewardClaimStatus.AVAILABLE,
        },
      }));

    const gift = chooseGift(activeGifts);
    if (!gift) {
      throw new Error("У компании пока нет активных подарков для коробки");
    }

    const openedAt = new Date();
    const openedClaim = await tx.rewardClaim.update({
      where: { id: claim.id },
      data: {
        giftOptionId: gift.id,
        title: gift.title,
        description: gift.description,
        status: RewardClaimStatus.OPENED,
        openedAt,
      },
      include: { giftOption: true },
    });

    await tx.customerMembership.update({
      where: { id: membership.id },
      data: { pendingReward: gift.title, lastActionAt: openedAt },
    });

    await tx.loyaltyTransaction.create({
      data: {
        companyId: membership.companyId,
        membershipId: membership.id,
        cashierId: userId,
        type: LoyaltyTransactionType.REWARD_OPENED,
        countBefore: membership.currentCount,
        countAfter: membership.currentCount,
        rewardTitle: gift.title,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: userId,
        companyId: membership.companyId,
        action: "REWARD_CLAIM_OPENED",
        entityType: "RewardClaim",
        entityId: openedClaim.id,
        metadataJson: JSON.stringify({
          membershipId: membership.id,
          giftOptionId: gift.id,
          rewardTitle: gift.title,
          openedAt: openedAt.toISOString(),
        }),
      },
    });

    return openedClaim;
  });
}

export function getSuspiciousLoyaltyReason(error: unknown): SuspiciousLoyaltyReason | null {
  if (!(error instanceof Error)) {
    return null;
  }

  const entry = Object.entries(suspiciousMessages).find(([, message]) => message === error.message);
  return entry ? (entry[0] as SuspiciousLoyaltyReason) : null;
}

export async function recordSuspiciousLoyaltyAttempt({
  companyId,
  membershipId,
  cashierId,
  token,
  source,
  operation,
  reason,
}: {
  companyId: string;
  membershipId: string;
  cashierId: string;
  token?: string;
  source: "scan" | "api";
  operation: "purchase" | "reward";
  reason: SuspiciousLoyaltyReason;
}) {
  const db = getDb();
  const membership = await db.customerMembership.findFirst({
    where: { id: membershipId, companyId },
    include: { user: true },
  });

  await db.auditLog.create({
    data: {
      actorUserId: cashierId,
      companyId,
      action: "SUSPICIOUS_REPEAT_PURCHASE",
      entityType: "CustomerMembership",
      entityId: membershipId || null,
      metadataJson: JSON.stringify({
        reason,
        source,
        operation,
        token: token || null,
        customerName: membership?.user.name ?? null,
        customerPhone: membership?.user.phone ?? null,
        lastActionAt: membership?.lastActionAt?.toISOString() ?? null,
        guardSeconds: REPEAT_GUARD_SECONDS,
        dailyLimit: DAILY_PURCHASE_LIMIT_PER_CUSTOMER,
      }),
    },
  });
}

export async function grantReward(companyId: string, membershipId: string, cashierId: string) {
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

    if (membership.userId === cashierId) {
      throw new Error(SELF_OPERATION_MESSAGE);
    }

    if (!membership.rewardAvailable) {
      throw new Error("Подарок пока недоступен");
    }

    const program = membership.company.loyaltyProgram;
    const isGiftBox = isGiftBoxProgram(program, membership.company.giftOptions);
    if (isGiftBox) {
      throw new Error("Для выдачи подарка отсканируйте подарочный QR-код клиента");
    }

    await redeemMembershipRewardInTransaction(tx, {
      companyId,
      membership,
      cashierId,
      claimId: null,
      rewardTitle: membership.pendingReward ?? program.rewardTitle,
    });
  });
}

export async function findRewardClaimForScan(token: string) {
  const normalizedToken = normalizeRewardClaimToken(token);

  return getDb().rewardClaim.findUnique({
    where: { token: normalizedToken },
    include: {
      company: true,
      membership: {
        include: {
          user: true,
          company: { include: { loyaltyProgram: true } },
        },
      },
      user: true,
      giftOption: true,
      redeemedBy: { select: { id: true, name: true } },
    },
  });
}

export async function redeemRewardClaimByToken(companyId: string, token: string, cashierId: string) {
  return getDb().$transaction(async (tx: Prisma.TransactionClient) => {
    const normalizedToken = normalizeRewardClaimToken(token);
    const claim = await tx.rewardClaim.findUnique({
      where: { token: normalizedToken },
      include: {
        membership: { include: { company: { include: { loyaltyProgram: true } } } },
      },
    });

    if (!claim) {
      throw new Error("Подарочный QR не найден");
    }

    if (claim.companyId !== companyId) {
      throw new Error("Этот подарок не относится к вашей компании");
    }

    if (claim.status === RewardClaimStatus.REDEEMED) {
      throw new Error("Этот подарок уже был выдан");
    }

    if (claim.status === RewardClaimStatus.AVAILABLE) {
      throw new Error("Клиент ещё не открыл подарок");
    }

    if (claim.status !== RewardClaimStatus.OPENED) {
      throw new Error("Этот подарок сейчас недоступен для выдачи");
    }

    const company = await refreshCompanyInTransaction(tx, companyId);
    if (!company || !hasActiveAccess(company.status, company.trialEndsAt, company.paidUntil)) {
      throw new Error("Сервис компании временно недоступен из-за статуса подписки");
    }

    if (claim.membership.userId === cashierId) {
      throw new Error(SELF_OPERATION_MESSAGE);
    }

    if (!claim.membership.rewardAvailable) {
      throw new Error("Подарок уже недоступен по карте клиента");
    }

    await redeemMembershipRewardInTransaction(tx, {
      companyId,
      membership: claim.membership,
      cashierId,
      claimId: claim.id,
      rewardTitle: claim.title ?? claim.membership.pendingReward ?? claim.membership.company.loyaltyProgram?.rewardTitle ?? "Подарок",
    });
  });
}

async function redeemMembershipRewardInTransaction(
  tx: Prisma.TransactionClient,
  {
    companyId,
    membership,
    cashierId,
    claimId,
    rewardTitle,
  }: {
    companyId: string;
    membership: Pick<CustomerMembership, "id" | "currentCount" | "pendingReward">;
    cashierId: string;
    claimId: string | null;
    rewardTitle: string;
  },
) {
  const countBefore = membership.currentCount;
  const redeemedAt = new Date();

  await tx.customerMembership.update({
    where: { id: membership.id },
    data: {
      currentCount: 0,
      rewardAvailable: false,
      pendingReward: null,
      totalRewards: { increment: 1 },
      lastActionAt: redeemedAt,
    },
  });

  if (claimId) {
    await tx.rewardClaim.update({
      where: { id: claimId },
      data: {
        status: RewardClaimStatus.REDEEMED,
        redeemedAt,
        redeemedById: cashierId,
      },
    });
  }

  await tx.loyaltyTransaction.create({
    data: {
      companyId,
      membershipId: membership.id,
      cashierId,
      type: claimId ? LoyaltyTransactionType.REWARD_REDEEMED : LoyaltyTransactionType.REWARD_GRANTED,
      countBefore,
      countAfter: 0,
      rewardTitle,
    },
  });

  await tx.auditLog.create({
    data: {
      actorUserId: cashierId,
      companyId,
      action: claimId ? "REWARD_CLAIM_REDEEMED" : "LOYALTY_REWARD_GRANTED",
      entityType: claimId ? "RewardClaim" : "CustomerMembership",
      entityId: claimId ?? membership.id,
      metadataJson: JSON.stringify({
        membershipId: membership.id,
        rewardClaimId: claimId,
        rewardTitle,
        redeemedAt: redeemedAt.toISOString(),
      }),
    },
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

export function newRewardToken() {
  return randomUUID();
}

export function newGlobalQrToken() {
  return randomUUID();
}

export async function ensureGlobalQrToken(user: Pick<User, "id"> & { globalQrToken?: string | null }) {
  if (user.globalQrToken) {
    return user.globalQrToken;
  }

  const existing = await getDb().user.findUnique({
    where: { id: user.id },
    select: { globalQrToken: true },
  });

  if (existing?.globalQrToken) {
    return existing.globalQrToken;
  }

  const updated = await getDb().user.update({
    where: { id: user.id },
    data: { globalQrToken: newGlobalQrToken() },
    select: { globalQrToken: true },
  });

  return updated.globalQrToken!;
}

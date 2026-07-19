import { mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dbPath = join(root, "prisma", "dev.db");

mkdirSync(dirname(dbPath), { recursive: true });
rmSync(dbPath, { force: true });

const db = new DatabaseSync(dbPath);

db.exec(`
PRAGMA foreign_keys = ON;

CREATE TABLE "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "passwordHash" TEXT NOT NULL,
  "globalRole" TEXT NOT NULL DEFAULT 'USER',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE INDEX "User_email_idx" ON "User"("email");

CREATE TABLE "Company" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "businessType" TEXT NOT NULL,
  "icon" TEXT NOT NULL DEFAULT '☕',
  "themeColor" TEXT NOT NULL DEFAULT '#7c3f22',
  "city" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "ownerName" TEXT NOT NULL,
  "ownerPhone" TEXT NOT NULL,
  "ownerEmail" TEXT NOT NULL,
  "inn" TEXT,
  "comment" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "trialStartedAt" DATETIME,
  "trialEndsAt" DATETIME,
  "paidUntil" DATETIME,
  "lastPaidAt" DATETIME,
  "isBlocked" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");
CREATE INDEX "Company_status_idx" ON "Company"("status");
CREATE INDEX "Company_city_idx" ON "Company"("city");

CREATE TABLE "CompanyUser" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "CompanyUser_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CompanyUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CompanyUser_companyId_userId_key" ON "CompanyUser"("companyId", "userId");
CREATE INDEX "CompanyUser_userId_idx" ON "CompanyUser"("userId");

CREATE TABLE "LoyaltyProgram" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "programType" TEXT NOT NULL DEFAULT 'CLASSIC_REWARD',
  "icon" TEXT NOT NULL DEFAULT '☕',
  "goalCount" INTEGER NOT NULL DEFAULT 6,
  "rewardTitle" TEXT NOT NULL DEFAULT 'Бесплатный кофе',
  "rewardDescription" TEXT NOT NULL DEFAULT 'Следующая покупка в подарок',
  "themeColor" TEXT NOT NULL DEFAULT '#7c3f22',
  "isGiftBoxEnabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "LoyaltyProgram_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LoyaltyProgram_companyId_key" ON "LoyaltyProgram"("companyId");

CREATE TABLE "CustomerMembership" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "qrToken" TEXT NOT NULL,
  "currentCount" INTEGER NOT NULL DEFAULT 0,
  "totalPurchases" INTEGER NOT NULL DEFAULT 0,
  "totalRewards" INTEGER NOT NULL DEFAULT 0,
  "rewardAvailable" BOOLEAN NOT NULL DEFAULT false,
  "lastActionAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "CustomerMembership_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CustomerMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CustomerMembership_qrToken_key" ON "CustomerMembership"("qrToken");
CREATE UNIQUE INDEX "CustomerMembership_companyId_userId_key" ON "CustomerMembership"("companyId", "userId");
CREATE INDEX "CustomerMembership_companyId_qrToken_idx" ON "CustomerMembership"("companyId", "qrToken");

CREATE TABLE "LoyaltyTransaction" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "membershipId" TEXT NOT NULL,
  "cashierId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "countBefore" INTEGER NOT NULL,
  "countAfter" INTEGER NOT NULL,
  "rewardTitle" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoyaltyTransaction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LoyaltyTransaction_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "CustomerMembership" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LoyaltyTransaction_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "LoyaltyTransaction_companyId_createdAt_idx" ON "LoyaltyTransaction"("companyId", "createdAt");
CREATE INDEX "LoyaltyTransaction_membershipId_createdAt_idx" ON "LoyaltyTransaction"("membershipId", "createdAt");
CREATE INDEX "LoyaltyTransaction_cashierId_createdAt_idx" ON "LoyaltyTransaction"("cashierId", "createdAt");

CREATE TABLE "GiftOption" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "probabilityWeight" INTEGER NOT NULL DEFAULT 1,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "GiftOption_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "GiftOption_companyId_isActive_idx" ON "GiftOption"("companyId", "isActive");

CREATE TABLE "SubscriptionPayment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "paidAt" DATETIME NOT NULL,
  "periodStart" DATETIME NOT NULL,
  "periodEnd" DATETIME NOT NULL,
  "method" TEXT NOT NULL DEFAULT 'manual',
  "comment" TEXT,
  "confirmedById" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubscriptionPayment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SubscriptionPayment_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "SubscriptionPayment_companyId_paidAt_idx" ON "SubscriptionPayment"("companyId", "paidAt");

CREATE TABLE "OfferAcceptance" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "offerVersion" TEXT NOT NULL,
  "acceptedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ip" TEXT,
  "userAgent" TEXT,
  CONSTRAINT "OfferAcceptance_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OfferAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "OfferAcceptance_companyId_acceptedAt_idx" ON "OfferAcceptance"("companyId", "acceptedAt");

CREATE TABLE "PersonalDataConsent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "companyId" TEXT,
  "consentVersion" TEXT NOT NULL,
  "acceptedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ip" TEXT,
  "userAgent" TEXT,
  CONSTRAINT "PersonalDataConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PersonalDataConsent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PersonalDataConsent_userId_acceptedAt_idx" ON "PersonalDataConsent"("userId", "acceptedAt");
CREATE INDEX "PersonalDataConsent_companyId_acceptedAt_idx" ON "PersonalDataConsent"("companyId", "acceptedAt");

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "actorUserId" TEXT,
  "companyId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "metadataJson" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AuditLog_companyId_createdAt_idx" ON "AuditLog"("companyId", "createdAt");
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
`);

db.close();
console.log(`SQLite database is ready: ${dbPath}`);

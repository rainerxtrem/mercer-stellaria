-- CreateTable
CREATE TABLE "SubscriptionRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestNumber" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "requestedFormula" TEXT NOT NULL,
    "requestedCategory" TEXT NOT NULL,
    "currentFormula" TEXT,
    "type" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "advisorValidated" BOOLEAN NOT NULL DEFAULT false,
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "reviewNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SubscriptionRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SubscriptionRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "discordId" TEXT,
    "fullName" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "avatarUrl" TEXT,
    "birthDate" DATETIME,
    "phone" TEXT,
    "discordHandle" TEXT,
    "profileCompleted" BOOLEAN NOT NULL DEFAULT false,
    "riskQuestionnaire" JSONB,
    "riskScore" INTEGER,
    "riskLabel" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "archivedById" TEXT,
    "role" TEXT NOT NULL DEFAULT 'CLIENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "accountManagerId" TEXT,
    CONSTRAINT "User_accountManagerId_fkey" FOREIGN KEY ("accountManagerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("accountManagerId", "avatarUrl", "birthDate", "createdAt", "discordHandle", "discordId", "email", "firstName", "fullName", "id", "isActive", "lastName", "passwordHash", "phone", "profileCompleted", "riskLabel", "riskQuestionnaire", "riskScore", "role", "updatedAt") SELECT "accountManagerId", "avatarUrl", "birthDate", "createdAt", "discordHandle", "discordId", "email", "firstName", "fullName", "id", "isActive", "lastName", "passwordHash", "phone", "profileCompleted", "riskLabel", "riskQuestionnaire", "riskScore", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_discordId_key" ON "User"("discordId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionRequest_requestNumber_key" ON "SubscriptionRequest"("requestNumber");

-- CreateIndex
CREATE INDEX "SubscriptionRequest_clientId_status_idx" ON "SubscriptionRequest"("clientId", "status");

-- CreateIndex
CREATE INDEX "SubscriptionRequest_status_idx" ON "SubscriptionRequest"("status");

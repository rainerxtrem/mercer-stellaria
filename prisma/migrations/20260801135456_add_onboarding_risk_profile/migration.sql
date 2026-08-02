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
    "role" TEXT NOT NULL DEFAULT 'CLIENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "accountManagerId" TEXT,
    CONSTRAINT "User_accountManagerId_fkey" FOREIGN KEY ("accountManagerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("accountManagerId", "avatarUrl", "createdAt", "discordHandle", "discordId", "email", "fullName", "id", "isActive", "passwordHash", "phone", "role", "updatedAt") SELECT "accountManagerId", "avatarUrl", "createdAt", "discordHandle", "discordId", "email", "fullName", "id", "isActive", "passwordHash", "phone", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_discordId_key" ON "User"("discordId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

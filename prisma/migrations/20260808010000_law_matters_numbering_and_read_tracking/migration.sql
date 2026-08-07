-- AlterTable
ALTER TABLE "Claim" ADD COLUMN "clientLastReadAt" DATETIME;
ALTER TABLE "Claim" ADD COLUMN "staffLastReadAt" DATETIME;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "citizenUniqueId" TEXT;

-- CreateTable
CREATE TABLE "NumberSequence" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "prefix" TEXT NOT NULL,
    "nextValue" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LawMatter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matterNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "clientId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "archivedById" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "lastActivityAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LawMatter_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LawMatter_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LawMatter_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LawMatter_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LawMatterParticipant" (
    "matterId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("matterId", "clientId"),
    CONSTRAINT "LawMatterParticipant_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "LawMatter" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LawMatterParticipant_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LawMatterMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matterId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "documentLink" TEXT,
    "signatureLink" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LawMatterMessage_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "LawMatter" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LawMatterMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LawMatterTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "dueDate" DATETIME,
    "assigneeId" TEXT,
    "createdById" TEXT,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LawMatterTask_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "LawMatter" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LawMatterTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LawMatterTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LawInvoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNumber" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "issueDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" DATETIME,
    "sentAt" DATETIME,
    "signedAt" DATETIME,
    "paidAt" DATETIME,
    "canceledAt" DATETIME,
    "subtotal" REAL NOT NULL DEFAULT 0,
    "discountTotal" REAL NOT NULL DEFAULT 0,
    "taxTotal" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL DEFAULT 0,
    "pdfUrl" TEXT,
    "shareTokenHash" TEXT,
    "shareTokenExpiresAt" DATETIME,
    "archivedAt" DATETIME,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LawInvoice_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "LawMatter" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LawInvoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LawInvoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LawInvoice_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LawInvoiceLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "pricingItemId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unitPrice" REAL NOT NULL,
    "discount" REAL NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "lineTotal" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LawInvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "LawInvoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LawInvoiceLine_pricingItemId_fkey" FOREIGN KEY ("pricingItemId") REFERENCES "PricingCatalogItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PricingCatalogItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaultUnitPrice" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PricingCatalogItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PricingCatalogItem_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Grade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserGrade" (
    "userId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedById" TEXT,

    PRIMARY KEY ("userId", "gradeId"),
    CONSTRAINT "UserGrade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserGrade_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserGrade_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PermissionResource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GradePermission" (
    "gradeId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,

    PRIMARY KEY ("gradeId", "resourceId"),
    CONSTRAINT "GradePermission_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GradePermission_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "PermissionResource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoutePermissionBinding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pattern" TEXT NOT NULL,
    "matchType" TEXT NOT NULL DEFAULT 'PREFIX',
    "resourceId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RoutePermissionBinding_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "PermissionResource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContactConversationState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "conversationId" TEXT,
    "clientLastReadAt" DATETIME,
    "staffLastReadAt" DATETIME,
    "clientArchivedAt" DATETIME,
    "staffArchivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContactConversationState_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContactConversationArchive" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "openedAt" DATETIME NOT NULL,
    "closedAt" DATETIME,
    "handledById" TEXT,
    "handledByName" TEXT,
    "closureReason" TEXT,
    "closedById" TEXT,
    "closedByRole" TEXT,
    "closedByName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContactConversationArchive_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContactConversationArchive_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClaimMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "claimId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "documentLink" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClaimMessage_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClaimMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "conversationId" TEXT,
    "senderId" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "documentLink" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContactMessage_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContactMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" DATETIME,
    CONSTRAINT "AppNotification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RiskQuestionnaireHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "actorId" TEXT,
    "oldAnswers" JSONB,
    "newAnswers" JSONB NOT NULL,
    "oldScore" INTEGER,
    "newScore" INTEGER NOT NULL,
    "oldLabel" TEXT,
    "newLabel" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RiskQuestionnaireHistory_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RiskQuestionnaireHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DocumentTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DocumentTemplate_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GeneratedDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "clientId" TEXT,
    "contractId" TEXT,
    "contentSnapshot" TEXT NOT NULL,
    "payloadSnapshot" JSONB,
    "signatureMethod" TEXT,
    "signatureData" TEXT,
    "signedAt" DATETIME,
    "pdfUrl" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "matterId" TEXT,
    CONSTRAINT "GeneratedDocument_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GeneratedDocument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GeneratedDocument_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GeneratedDocument_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GeneratedDocument_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "LawMatter" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "LawMatter_matterNumber_key" ON "LawMatter"("matterNumber");

-- CreateIndex
CREATE INDEX "LawMatter_clientId_status_idx" ON "LawMatter"("clientId", "status");

-- CreateIndex
CREATE INDEX "LawMatter_isArchived_lastActivityAt_idx" ON "LawMatter"("isArchived", "lastActivityAt");

-- CreateIndex
CREATE INDEX "LawMatterParticipant_clientId_assignedAt_idx" ON "LawMatterParticipant"("clientId", "assignedAt");

-- CreateIndex
CREATE INDEX "LawMatterMessage_matterId_createdAt_idx" ON "LawMatterMessage"("matterId", "createdAt");

-- CreateIndex
CREATE INDEX "LawMatterMessage_senderId_idx" ON "LawMatterMessage"("senderId");

-- CreateIndex
CREATE INDEX "LawMatterTask_matterId_status_idx" ON "LawMatterTask"("matterId", "status");

-- CreateIndex
CREATE INDEX "LawMatterTask_assigneeId_dueDate_idx" ON "LawMatterTask"("assigneeId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "LawInvoice_invoiceNumber_key" ON "LawInvoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "LawInvoice_matterId_status_idx" ON "LawInvoice"("matterId", "status");

-- CreateIndex
CREATE INDEX "LawInvoice_clientId_createdAt_idx" ON "LawInvoice"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "LawInvoiceLine_invoiceId_sortOrder_idx" ON "LawInvoiceLine"("invoiceId", "sortOrder");

-- CreateIndex
CREATE INDEX "LawInvoiceLine_pricingItemId_idx" ON "LawInvoiceLine"("pricingItemId");

-- CreateIndex
CREATE UNIQUE INDEX "PricingCatalogItem_code_key" ON "PricingCatalogItem"("code");

-- CreateIndex
CREATE INDEX "PricingCatalogItem_isActive_idx" ON "PricingCatalogItem"("isActive");

-- CreateIndex
CREATE INDEX "PricingCatalogItem_name_idx" ON "PricingCatalogItem"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Grade_code_key" ON "Grade"("code");

-- CreateIndex
CREATE INDEX "Grade_rank_idx" ON "Grade"("rank");

-- CreateIndex
CREATE INDEX "UserGrade_gradeId_idx" ON "UserGrade"("gradeId");

-- CreateIndex
CREATE INDEX "UserGrade_assignedById_assignedAt_idx" ON "UserGrade"("assignedById", "assignedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PermissionResource_key_key" ON "PermissionResource"("key");

-- CreateIndex
CREATE INDEX "PermissionResource_type_idx" ON "PermissionResource"("type");

-- CreateIndex
CREATE INDEX "GradePermission_resourceId_idx" ON "GradePermission"("resourceId");

-- CreateIndex
CREATE INDEX "RoutePermissionBinding_isEnabled_idx" ON "RoutePermissionBinding"("isEnabled");

-- CreateIndex
CREATE INDEX "RoutePermissionBinding_matchType_pattern_idx" ON "RoutePermissionBinding"("matchType", "pattern");

-- CreateIndex
CREATE UNIQUE INDEX "RoutePermissionBinding_matchType_pattern_resourceId_key" ON "RoutePermissionBinding"("matchType", "pattern", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "ContactConversationState_clientId_key" ON "ContactConversationState"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ContactConversationArchive_conversationId_key" ON "ContactConversationArchive"("conversationId");

-- CreateIndex
CREATE INDEX "ContactConversationArchive_clientId_closedAt_idx" ON "ContactConversationArchive"("clientId", "closedAt");

-- CreateIndex
CREATE INDEX "ContactConversationArchive_closedById_createdAt_idx" ON "ContactConversationArchive"("closedById", "createdAt");

-- CreateIndex
CREATE INDEX "ClaimMessage_claimId_createdAt_idx" ON "ClaimMessage"("claimId", "createdAt");

-- CreateIndex
CREATE INDEX "ClaimMessage_senderId_idx" ON "ClaimMessage"("senderId");

-- CreateIndex
CREATE INDEX "ContactMessage_clientId_createdAt_idx" ON "ContactMessage"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "ContactMessage_conversationId_createdAt_idx" ON "ContactMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "ContactMessage_senderId_idx" ON "ContactMessage"("senderId");

-- CreateIndex
CREATE INDEX "AppNotification_recipientId_createdAt_idx" ON "AppNotification"("recipientId", "createdAt");

-- CreateIndex
CREATE INDEX "AppNotification_recipientId_isRead_idx" ON "AppNotification"("recipientId", "isRead");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_createdAt_idx" ON "AuditLog"("entityType", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "RiskQuestionnaireHistory_clientId_createdAt_idx" ON "RiskQuestionnaireHistory"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "RiskQuestionnaireHistory_actorId_createdAt_idx" ON "RiskQuestionnaireHistory"("actorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentTemplate_slug_key" ON "DocumentTemplate"("slug");

-- CreateIndex
CREATE INDEX "DocumentTemplate_isActive_createdAt_idx" ON "DocumentTemplate"("isActive", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedDocument_documentNumber_key" ON "GeneratedDocument"("documentNumber");

-- CreateIndex
CREATE INDEX "GeneratedDocument_templateId_createdAt_idx" ON "GeneratedDocument"("templateId", "createdAt");

-- CreateIndex
CREATE INDEX "GeneratedDocument_clientId_createdAt_idx" ON "GeneratedDocument"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "GeneratedDocument_createdById_createdAt_idx" ON "GeneratedDocument"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "GeneratedDocument_matterId_createdAt_idx" ON "GeneratedDocument"("matterId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_citizenUniqueId_key" ON "User"("citizenUniqueId");

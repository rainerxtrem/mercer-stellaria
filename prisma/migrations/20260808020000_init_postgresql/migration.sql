-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PUBLIC', 'CLIENT', 'COLLABORATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "PermissionResourceType" AS ENUM ('SPACE', 'PAGE', 'MODULE', 'ACTION', 'FEATURE');

-- CreateEnum
CREATE TYPE "RouteMatchType" AS ENUM ('EXACT', 'PREFIX', 'REGEXP');

-- CreateEnum
CREATE TYPE "ContractCategory" AS ENUM ('HEALTH', 'THEFT_BURGLARY', 'PROFESSIONAL');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'PENDING_SIGNATURE', 'ACTIVE', 'SUSPENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "SignatureMethod" AS ENUM ('DRAWN_CANVAS', 'CERTIFIED_CLICK');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PAID', 'LATE', 'CANCELED');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'WAITING_DETAILS', 'APPROVED', 'REJECTED', 'PAID');

-- CreateEnum
CREATE TYPE "SubscriptionRequestType" AS ENUM ('NEW_SUBSCRIPTION', 'UPGRADE');

-- CreateEnum
CREATE TYPE "SubscriptionRequestStatus" AS ENUM ('REQUESTED', 'WAITING_MEETING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CONTRACT', 'CLAIM', 'BILLING', 'MESSAGE', 'REQUEST', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR');

-- CreateEnum
CREATE TYPE "LawMatterStatus" AS ENUM ('IN_PROGRESS', 'PENDING', 'HOLD', 'CLOSED');

-- CreateEnum
CREATE TYPE "LawInvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'SIGNED', 'EXPIRED', 'BILLED', 'PAID', 'CANCELED');

-- CreateEnum
CREATE TYPE "LawTaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "discordId" TEXT,
    "fullName" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "avatarUrl" TEXT,
    "birthDate" TIMESTAMP(3),
    "phone" TEXT,
    "citizenUniqueId" TEXT,
    "discordHandle" TEXT,
    "profileCompleted" BOOLEAN NOT NULL DEFAULT false,
    "riskQuestionnaire" JSONB,
    "riskScore" INTEGER,
    "riskLabel" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "archivedById" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accountManagerId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NumberSequence" (
    "key" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "nextValue" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NumberSequence_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "LawMatter" (
    "id" TEXT NOT NULL,
    "matterNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "clientId" TEXT NOT NULL,
    "status" "LawMatterStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "archivedById" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LawMatter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LawMatterParticipant" (
    "matterId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LawMatterParticipant_pkey" PRIMARY KEY ("matterId","clientId")
);

-- CreateTable
CREATE TABLE "LawMatterMessage" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderRole" "UserRole" NOT NULL,
    "senderName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "documentLink" TEXT,
    "signatureLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LawMatterMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LawMatterTask" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "LawTaskStatus" NOT NULL DEFAULT 'TODO',
    "dueDate" TIMESTAMP(3),
    "assigneeId" TEXT,
    "createdById" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LawMatterTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LawInvoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "status" "LawInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pdfUrl" TEXT,
    "shareTokenHash" TEXT,
    "shareTokenExpiresAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LawInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LawInvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "pricingItemId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "lineTotal" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LawInvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingCatalogItem" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaultUnitPrice" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingCatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grade" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGrade" (
    "userId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedById" TEXT,

    CONSTRAINT "UserGrade_pkey" PRIMARY KEY ("userId","gradeId")
);

-- CreateTable
CREATE TABLE "PermissionResource" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "PermissionResourceType" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermissionResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradePermission" (
    "gradeId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GradePermission_pkey" PRIMARY KEY ("gradeId","resourceId")
);

-- CreateTable
CREATE TABLE "RoutePermissionBinding" (
    "id" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "matchType" "RouteMatchType" NOT NULL DEFAULT 'PREFIX',
    "resourceId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutePermissionBinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionRequest" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "requestedFormula" TEXT NOT NULL,
    "requestedCategory" "ContractCategory" NOT NULL,
    "currentFormula" TEXT,
    "type" "SubscriptionRequestType" NOT NULL,
    "reason" TEXT,
    "status" "SubscriptionRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "advisorValidated" BOOLEAN NOT NULL DEFAULT false,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "category" "ContractCategory" NOT NULL,
    "formulaName" TEXT NOT NULL,
    "weeklyPremium" DOUBLE PRECISION NOT NULL,
    "coverageSummary" JSONB NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "expirationDate" TIMESTAMP(3),
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "signatureMethod" "SignatureMethod",
    "signatureData" TEXT,
    "signedAt" TIMESTAMP(3),
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "reminderSentAt" TIMESTAMP(3),
    "discordWebhookId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "contractId" TEXT,
    "incidentType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidenceLink" TEXT,
    "lspdReportLink" TEXT,
    "incidentDate" TIMESTAMP(3) NOT NULL,
    "declaredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ClaimStatus" NOT NULL DEFAULT 'SUBMITTED',
    "requestedAmount" DOUBLE PRECISION,
    "approvedAmount" DOUBLE PRECISION,
    "reviewedById" TEXT,
    "decisionNotes" TEXT,
    "clientLastReadAt" TIMESTAMP(3),
    "staffLastReadAt" TIMESTAMP(3),
    "reimbursedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactConversationState" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "conversationId" TEXT,
    "clientLastReadAt" TIMESTAMP(3),
    "staffLastReadAt" TIMESTAMP(3),
    "clientArchivedAt" TIMESTAMP(3),
    "staffArchivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactConversationState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactConversationArchive" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "handledById" TEXT,
    "handledByName" TEXT,
    "closureReason" TEXT,
    "closedById" TEXT,
    "closedByRole" "UserRole",
    "closedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactConversationArchive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimMessage" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderRole" "UserRole" NOT NULL,
    "senderName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "documentLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClaimMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "conversationId" TEXT,
    "senderId" TEXT NOT NULL,
    "senderRole" "UserRole" NOT NULL,
    "senderName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "documentLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppNotification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "severity" "NotificationSeverity" NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "AppNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" "UserRole",
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskQuestionnaireHistory" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "actorId" TEXT,
    "oldAnswers" JSONB,
    "newAnswers" JSONB NOT NULL,
    "oldScore" INTEGER,
    "newScore" INTEGER NOT NULL,
    "oldLabel" TEXT,
    "newLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskQuestionnaireHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedDocument" (
    "id" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "clientId" TEXT,
    "contractId" TEXT,
    "contentSnapshot" TEXT NOT NULL,
    "payloadSnapshot" JSONB,
    "signatureMethod" "SignatureMethod",
    "signatureData" TEXT,
    "signedAt" TIMESTAMP(3),
    "pdfUrl" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "matterId" TEXT,

    CONSTRAINT "GeneratedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_discordId_key" ON "User"("discordId");

-- CreateIndex
CREATE UNIQUE INDEX "User_citizenUniqueId_key" ON "User"("citizenUniqueId");

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
CREATE UNIQUE INDEX "SubscriptionRequest_requestNumber_key" ON "SubscriptionRequest"("requestNumber");

-- CreateIndex
CREATE INDEX "SubscriptionRequest_clientId_status_idx" ON "SubscriptionRequest"("clientId", "status");

-- CreateIndex
CREATE INDEX "SubscriptionRequest_status_idx" ON "SubscriptionRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_contractNumber_key" ON "Contract"("contractNumber");

-- CreateIndex
CREATE INDEX "Contract_clientId_idx" ON "Contract"("clientId");

-- CreateIndex
CREATE INDEX "Contract_agentId_idx" ON "Contract"("agentId");

-- CreateIndex
CREATE INDEX "Contract_status_idx" ON "Contract"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_clientId_status_idx" ON "Invoice"("clientId", "status");

-- CreateIndex
CREATE INDEX "Invoice_contractId_dueDate_idx" ON "Invoice"("contractId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "Claim_claimNumber_key" ON "Claim"("claimNumber");

-- CreateIndex
CREATE INDEX "Claim_clientId_status_idx" ON "Claim"("clientId", "status");

-- CreateIndex
CREATE INDEX "Claim_reviewedById_idx" ON "Claim"("reviewedById");

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

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_accountManagerId_fkey" FOREIGN KEY ("accountManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LawMatter" ADD CONSTRAINT "LawMatter_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LawMatter" ADD CONSTRAINT "LawMatter_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LawMatter" ADD CONSTRAINT "LawMatter_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LawMatter" ADD CONSTRAINT "LawMatter_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LawMatterParticipant" ADD CONSTRAINT "LawMatterParticipant_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "LawMatter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LawMatterParticipant" ADD CONSTRAINT "LawMatterParticipant_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LawMatterMessage" ADD CONSTRAINT "LawMatterMessage_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "LawMatter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LawMatterMessage" ADD CONSTRAINT "LawMatterMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LawMatterTask" ADD CONSTRAINT "LawMatterTask_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "LawMatter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LawMatterTask" ADD CONSTRAINT "LawMatterTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LawMatterTask" ADD CONSTRAINT "LawMatterTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LawInvoice" ADD CONSTRAINT "LawInvoice_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "LawMatter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LawInvoice" ADD CONSTRAINT "LawInvoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LawInvoice" ADD CONSTRAINT "LawInvoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LawInvoice" ADD CONSTRAINT "LawInvoice_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LawInvoiceLine" ADD CONSTRAINT "LawInvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "LawInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LawInvoiceLine" ADD CONSTRAINT "LawInvoiceLine_pricingItemId_fkey" FOREIGN KEY ("pricingItemId") REFERENCES "PricingCatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingCatalogItem" ADD CONSTRAINT "PricingCatalogItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingCatalogItem" ADD CONSTRAINT "PricingCatalogItem_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGrade" ADD CONSTRAINT "UserGrade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGrade" ADD CONSTRAINT "UserGrade_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGrade" ADD CONSTRAINT "UserGrade_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradePermission" ADD CONSTRAINT "GradePermission_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradePermission" ADD CONSTRAINT "GradePermission_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "PermissionResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutePermissionBinding" ADD CONSTRAINT "RoutePermissionBinding_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "PermissionResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionRequest" ADD CONSTRAINT "SubscriptionRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionRequest" ADD CONSTRAINT "SubscriptionRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactConversationState" ADD CONSTRAINT "ContactConversationState_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactConversationArchive" ADD CONSTRAINT "ContactConversationArchive_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactConversationArchive" ADD CONSTRAINT "ContactConversationArchive_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimMessage" ADD CONSTRAINT "ClaimMessage_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimMessage" ADD CONSTRAINT "ClaimMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactMessage" ADD CONSTRAINT "ContactMessage_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactMessage" ADD CONSTRAINT "ContactMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppNotification" ADD CONSTRAINT "AppNotification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskQuestionnaireHistory" ADD CONSTRAINT "RiskQuestionnaireHistory_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskQuestionnaireHistory" ADD CONSTRAINT "RiskQuestionnaireHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "LawMatter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

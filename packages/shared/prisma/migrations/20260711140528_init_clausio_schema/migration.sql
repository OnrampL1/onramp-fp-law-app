-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('CREATED', 'OWNER_ASSIGNED', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PlatformUserRole" AS ENUM ('SUPER_ADMIN', 'SUPPORT_ENGINEER');

-- CreateEnum
CREATE TYPE "PlatformUserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'INTERNAL');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ContractBusinessStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContractProcessingStatus" AS ENUM ('PENDING_EXTRACTION', 'EXTRACTION_COMPLETED', 'AI_PENDING', 'AI_COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ContractLegalState" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "WitnessStatus" AS ENUM ('ISSUED', 'USED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "AIAnalysisType" AS ENUM ('SUMMARY', 'RISK', 'CLAUSE_QUERY');

-- CreateEnum
CREATE TYPE "AIAnalysisStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('USER', 'PLATFORM_USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('ORGANIZATION_CREATED', 'OWNER_ASSIGNED', 'ORGANIZATION_ACTIVATED', 'ORGANIZATION_SUSPENDED', 'ORGANIZATION_ARCHIVED', 'ORGANIZATION_SETTINGS_UPDATED', 'OWNERSHIP_TRANSFERRED', 'OWNERSHIP_RECOVERED', 'USER_INVITED', 'INVITATION_ACCEPTED', 'INVITATION_REVOKED', 'USER_SUSPENDED', 'USER_REACTIVATED', 'USER_DEACTIVATED', 'USER_ROLE_CHANGED', 'CONTRACT_UPLOADED', 'CONTRACT_TEXT_EXTRACTED', 'CONTRACT_METADATA_UPDATED', 'CONTRACT_BUSINESS_STATUS_CHANGED', 'CONTRACT_PROCESSING_STATUS_CHANGED', 'CONTRACT_SOFT_DELETED', 'NOTE_ADDED', 'NOTE_EDITED', 'NOTE_DELETED', 'WITNESS_INVITATION_CREATED', 'WITNESS_ACCESSED', 'WITNESS_INVITATION_REVOKED', 'AI_ANALYSIS_REQUESTED', 'AI_ANALYSIS_COMPLETED', 'AI_ANALYSIS_FAILED', 'PLATFORM_SUPPORT_ACCESS_GRANTED', 'PLATFORM_SUPPORT_ACCESS_REVOKED');

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'CREATED',
    "owner_user_id" UUID,
    "owner_assigned_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_settings" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "language" TEXT NOT NULL DEFAULT 'en',
    "logo_url" TEXT,
    "notification_preferences" JSONB,
    "branding" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "PlatformUserRole" NOT NULL,
    "status" "PlatformUserStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'INVITED',
    "last_login_at" TIMESTAMP(3),
    "invitation_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "invited_by_user_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "revoked_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "uploaded_by_user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "counterparty" TEXT NOT NULL,
    "business_status" "ContractBusinessStatus" NOT NULL DEFAULT 'DRAFT',
    "processing_status" "ContractProcessingStatus" NOT NULL DEFAULT 'PENDING_EXTRACTION',
    "legal_state" "ContractLegalState",
    "tags" TEXT[],
    "expiration_date" DATE,
    "file_key" TEXT NOT NULL,
    "file_checksum" TEXT NOT NULL,
    "extracted_text" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_notes" (
    "id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "witness_tokens" (
    "id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "issued_by_user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "status" "WitnessStatus" NOT NULL DEFAULT 'ISSUED',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "witness_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_analyses" (
    "id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "type" "AIAnalysisType" NOT NULL,
    "status" "AIAnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "prompt_used" TEXT NOT NULL,
    "response" TEXT,
    "model_version" TEXT,
    "tokens_used" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "actor_type" "AuditActorType" NOT NULL,
    "actor_user_id" UUID,
    "actor_platform_user_id" UUID,
    "action" "AuditAction" NOT NULL,
    "target_entity_type" TEXT NOT NULL,
    "target_entity_id" UUID NOT NULL,
    "contract_id" UUID,
    "witness_invitation_id" UUID,
    "old_value" JSONB,
    "new_value" JSONB,
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_owner_user_id_key" ON "organizations"("owner_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_settings_organization_id_key" ON "organization_settings"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_users_email_key" ON "platform_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_invitation_id_key" ON "users"("invitation_id");

-- CreateIndex
CREATE INDEX "users_organization_id_role_idx" ON "users"("organization_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_hash_key" ON "invitations"("token_hash");

-- CreateIndex
CREATE INDEX "invitations_organization_id_email_idx" ON "invitations"("organization_id", "email");

-- CreateIndex
CREATE INDEX "contracts_organization_id_business_status_idx" ON "contracts"("organization_id", "business_status");

-- CreateIndex
CREATE INDEX "contracts_organization_id_processing_status_idx" ON "contracts"("organization_id", "processing_status");

-- CreateIndex
CREATE INDEX "contracts_organization_id_created_at_idx" ON "contracts"("organization_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "contracts_organization_id_expiration_date_idx" ON "contracts"("organization_id", "expiration_date");

-- CreateIndex
CREATE INDEX "contracts_tags_idx" ON "contracts" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "contract_notes_contract_id_created_at_idx" ON "contract_notes"("contract_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "witness_tokens_token_hash_key" ON "witness_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "ai_analyses_contract_id_type_idx" ON "ai_analyses"("contract_id", "type");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_created_at_idx" ON "audit_logs"("organization_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_settings" ADD CONSTRAINT "organization_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "invitations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_revoked_by_user_id_fkey" FOREIGN KEY ("revoked_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_notes" ADD CONSTRAINT "contract_notes_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_notes" ADD CONSTRAINT "contract_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "witness_tokens" ADD CONSTRAINT "witness_tokens_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "witness_tokens" ADD CONSTRAINT "witness_tokens_issued_by_user_id_fkey" FOREIGN KEY ("issued_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_platform_user_id_fkey" FOREIGN KEY ("actor_platform_user_id") REFERENCES "platform_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_witness_invitation_id_fkey" FOREIGN KEY ("witness_invitation_id") REFERENCES "witness_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

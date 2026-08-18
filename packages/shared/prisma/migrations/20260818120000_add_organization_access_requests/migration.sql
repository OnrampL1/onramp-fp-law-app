-- CreateEnum
CREATE TYPE "OrganizationAccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');

-- CreateEnum
CREATE TYPE "OrganizationAccessRequestCompanySize" AS ENUM (
  'ONE_TO_TEN',
  'ELEVEN_TO_FIFTY',
  'FIFTY_ONE_TO_TWO_HUNDRED',
  'TWO_HUNDRED_ONE_TO_ONE_THOUSAND',
  'ONE_THOUSAND_PLUS'
);

-- CreateTable
CREATE TABLE "organization_access_requests" (
  "id" UUID NOT NULL,
  "contact_first_name" TEXT NOT NULL,
  "contact_last_name" TEXT NOT NULL,
  "contact_email" TEXT NOT NULL,
  "organization_name" TEXT NOT NULL,
  "website_url" TEXT,
  "company_size" "OrganizationAccessRequestCompanySize",
  "country" TEXT,
  "intended_use" TEXT NOT NULL,
  "notes" TEXT,
  "status" "OrganizationAccessRequestStatus" NOT NULL DEFAULT 'PENDING',
  "reviewed_at" TIMESTAMP(3),
  "reviewed_by_platform_user_id" UUID,
  "decline_reason" TEXT,
  "organization_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "organization_access_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organization_access_requests_contact_email_key"
  ON "organization_access_requests"("contact_email");

-- CreateIndex
CREATE UNIQUE INDEX "organization_access_requests_organization_id_key"
  ON "organization_access_requests"("organization_id");

-- CreateIndex
CREATE INDEX "organization_access_requests_status_created_at_idx"
  ON "organization_access_requests"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "organization_access_requests_created_at_idx"
  ON "organization_access_requests"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "organization_access_requests"
  ADD CONSTRAINT "organization_access_requests_reviewed_by_platform_user_id_fkey"
  FOREIGN KEY ("reviewed_by_platform_user_id")
  REFERENCES "platform_users"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_access_requests"
  ADD CONSTRAINT "organization_access_requests_organization_id_fkey"
  FOREIGN KEY ("organization_id")
  REFERENCES "organizations"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
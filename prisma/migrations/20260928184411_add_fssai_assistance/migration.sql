-- CreateEnum
CREATE TYPE "FssaiAssistanceStatus" AS ENUM ('PENDING_PAYMENT', 'DOCUMENTS_SUBMITTED', 'APPLICATION_FILED', 'GOVT_REVIEW_IN_PROGRESS', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FssaiAssistanceDocumentType" AS ENUM ('IDENTITY_PROOF', 'ADDRESS_PROOF', 'KITCHEN_PHOTO', 'PASSPORT_PHOTO');

-- CreateTable
CREATE TABLE "fssai_assistance_requests" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "status" "FssaiAssistanceStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "govtFee" INTEGER NOT NULL DEFAULT 1000,
    "serviceFee" INTEGER NOT NULL DEFAULT 500,
    "totalFee" INTEGER NOT NULL DEFAULT 1500,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentRef" TEXT,
    "licenseNumber" TEXT,
    "validFrom" TIMESTAMP(3),
    "validTill" TIMESTAMP(3),
    "certificateUrl" TEXT,
    "rejectionReason" TEXT,
    "submittedAt" TIMESTAMP(3),
    "filedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fssai_assistance_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fssai_assistance_documents" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "type" "FssaiAssistanceDocumentType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fssai_assistance_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fssai_assistance_requests_accountId_idx" ON "fssai_assistance_requests"("accountId");

-- CreateIndex
CREATE INDEX "fssai_assistance_requests_status_idx" ON "fssai_assistance_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "fssai_assistance_documents_requestId_type_key" ON "fssai_assistance_documents"("requestId", "type");

-- AddForeignKey
ALTER TABLE "fssai_assistance_requests" ADD CONSTRAINT "fssai_assistance_requests_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "kitchen_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fssai_assistance_documents" ADD CONSTRAINT "fssai_assistance_documents_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "fssai_assistance_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

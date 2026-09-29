-- CreateTable
CREATE TABLE "upi_ids" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vpa" TEXT NOT NULL,
    "label" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upi_ids_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "upi_ids_userId_isDefault_idx" ON "upi_ids"("userId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "upi_ids_userId_vpa_key" ON "upi_ids"("userId", "vpa");

-- AddForeignKey
ALTER TABLE "upi_ids" ADD CONSTRAINT "upi_ids_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

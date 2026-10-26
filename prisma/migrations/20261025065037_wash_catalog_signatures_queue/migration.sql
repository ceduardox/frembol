-- AlterTable
ALTER TABLE "wash_intakes" ADD COLUMN     "clientSignature" TEXT,
ADD COLUMN     "queueStage" TEXT NOT NULL DEFAULT 'queued',
ADD COLUMN     "staffSignature" TEXT;

-- CreateTable
CREATE TABLE "wash_services" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prices" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "wash_services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wash_services_organizationId_idx" ON "wash_services"("organizationId");

-- AddForeignKey
ALTER TABLE "wash_services" ADD CONSTRAINT "wash_services_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

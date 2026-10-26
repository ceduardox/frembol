-- CreateTable
CREATE TABLE "vehicle_catalog_entries" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_catalog_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vehicle_catalog_entries_organizationId_idx" ON "vehicle_catalog_entries"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_catalog_entries_organizationId_make_model_key" ON "vehicle_catalog_entries"("organizationId", "make", "model");

-- AddForeignKey
ALTER TABLE "vehicle_catalog_entries" ADD CONSTRAINT "vehicle_catalog_entries_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

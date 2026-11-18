-- CreateTable
CREATE TABLE "salary_profiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monthlyAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startDate" TEXT NOT NULL,
    "cycleType" TEXT NOT NULL DEFAULT 'monthly',
    "cycleDay" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "userId" TEXT,
    "technicianId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_entries" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "effectiveDate" TEXT NOT NULL,
    "note" TEXT,
    "receiptName" TEXT,
    "receiptMimeType" TEXT,
    "receiptData" BYTEA,
    "createdById" TEXT,
    "profileId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "salary_profiles_organizationId_isActive_idx" ON "salary_profiles"("organizationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "salary_profiles_organizationId_userId_key" ON "salary_profiles"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "salary_profiles_organizationId_technicianId_key" ON "salary_profiles"("organizationId", "technicianId");

-- CreateIndex
CREATE INDEX "salary_entries_profileId_effectiveDate_idx" ON "salary_entries"("profileId", "effectiveDate");

-- CreateIndex
CREATE INDEX "salary_entries_organizationId_effectiveDate_idx" ON "salary_entries"("organizationId", "effectiveDate");

-- AddForeignKey
ALTER TABLE "salary_profiles" ADD CONSTRAINT "salary_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_profiles" ADD CONSTRAINT "salary_profiles_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "technicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_profiles" ADD CONSTRAINT "salary_profiles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_entries" ADD CONSTRAINT "salary_entries_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "salary_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_entries" ADD CONSTRAINT "salary_entries_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

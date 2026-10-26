-- CreateTable
CREATE TABLE "part_intakes" (
    "id" TEXT NOT NULL,
    "serviceRecordId" TEXT NOT NULL,
    "description" TEXT,
    "brand" TEXT,
    "serial" TEXT,
    "condition" TEXT,
    "accessories" TEXT,
    "notes" TEXT,
    "clientSignature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "part_intakes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "part_intakes_serviceRecordId_key" ON "part_intakes"("serviceRecordId");

-- AddForeignKey
ALTER TABLE "part_intakes" ADD CONSTRAINT "part_intakes_serviceRecordId_fkey" FOREIGN KEY ("serviceRecordId") REFERENCES "service_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

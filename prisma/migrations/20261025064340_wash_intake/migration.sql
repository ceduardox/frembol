-- CreateTable
CREATE TABLE "wash_intakes" (
    "id" TEXT NOT NULL,
    "serviceRecordId" TEXT NOT NULL,
    "vehicleClass" TEXT,
    "vehicleClassOther" TEXT,
    "fuelLevel" TEXT,
    "accessories" JSONB,
    "accessoriesOther" TEXT,
    "conditions" JSONB,
    "conditionsOther" TEXT,
    "arrivalState" TEXT,
    "scratches" TEXT,
    "authorizedExtra" TEXT,
    "authorizedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wash_intakes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wash_intakes_serviceRecordId_key" ON "wash_intakes"("serviceRecordId");

-- AddForeignKey
ALTER TABLE "wash_intakes" ADD CONSTRAINT "wash_intakes_serviceRecordId_fkey" FOREIGN KEY ("serviceRecordId") REFERENCES "service_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

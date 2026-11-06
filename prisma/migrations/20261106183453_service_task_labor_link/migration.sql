-- AlterTable
ALTER TABLE "service_labor" ADD COLUMN     "serviceTaskId" TEXT;

-- CreateIndex
CREATE INDEX "service_labor_serviceTaskId_idx" ON "service_labor"("serviceTaskId");

-- AddForeignKey
ALTER TABLE "service_labor" ADD CONSTRAINT "service_labor_serviceTaskId_fkey" FOREIGN KEY ("serviceTaskId") REFERENCES "service_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

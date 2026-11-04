-- CreateTable
CREATE TABLE "service_tasks" (
    "id" TEXT NOT NULL,
    "serviceRecordId" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "queueStage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_task_technicians" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_task_technicians_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_tasks_serviceRecordId_idx" ON "service_tasks"("serviceRecordId");

-- CreateIndex
CREATE INDEX "service_tasks_area_status_idx" ON "service_tasks"("area", "status");

-- CreateIndex
CREATE UNIQUE INDEX "service_tasks_serviceRecordId_area_key" ON "service_tasks"("serviceRecordId", "area");

-- CreateIndex
CREATE INDEX "service_task_technicians_technicianId_idx" ON "service_task_technicians"("technicianId");

-- CreateIndex
CREATE UNIQUE INDEX "service_task_technicians_taskId_technicianId_key" ON "service_task_technicians"("taskId", "technicianId");

-- AddForeignKey
ALTER TABLE "service_tasks" ADD CONSTRAINT "service_tasks_serviceRecordId_fkey" FOREIGN KEY ("serviceRecordId") REFERENCES "service_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_task_technicians" ADD CONSTRAINT "service_task_technicians_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "service_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_task_technicians" ADD CONSTRAINT "service_task_technicians_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "technicians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

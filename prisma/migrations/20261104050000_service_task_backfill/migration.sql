-- Every existing job becomes a visit with one task of the area it already has.
INSERT INTO "service_tasks" ("id", "serviceRecordId", "area", "status", "sortOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, r."id", r."jobKind", r."status", 0, now(), now()
FROM "service_records" r
ON CONFLICT ("serviceRecordId", "area") DO NOTHING;

-- The technician already assigned to the job is that task's technician.
INSERT INTO "service_task_technicians" ("id", "taskId", "technicianId", "createdAt")
SELECT gen_random_uuid()::text, t."id", r."technicianId", now()
FROM "service_tasks" t
JOIN "service_records" r ON r."id" = t."serviceRecordId"
WHERE r."technicianId" IS NOT NULL
ON CONFLICT ("taskId", "technicianId") DO NOTHING;

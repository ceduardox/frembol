-- Which line of the shop a job belongs to. Existing rows are vehicle work.
ALTER TABLE "service_records" ADD COLUMN "jobKind" TEXT NOT NULL DEFAULT 'vehicle';

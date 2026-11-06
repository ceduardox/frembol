-- AlterTable
ALTER TABLE "technicians" ADD COLUMN     "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[];

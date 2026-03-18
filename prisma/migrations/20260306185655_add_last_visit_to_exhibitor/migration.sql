-- AlterTable
ALTER TABLE "Exhibitor" ADD COLUMN     "lastVisitAt" TIMESTAMP(3),
ALTER COLUMN "installedAt" DROP DEFAULT;

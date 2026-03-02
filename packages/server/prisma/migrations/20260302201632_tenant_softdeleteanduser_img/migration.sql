-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "pictureUrl" TEXT;

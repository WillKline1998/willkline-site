/*
  Warnings:

  - Added the required column `updatedAt` to the `LabProject` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "LabProject" ADD COLUMN     "body" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "published" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "repoUrl" TEXT,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tech" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "MediaItem" ADD COLUMN     "published" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "title" SET DEFAULT '';

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "summary" TEXT NOT NULL DEFAULT '';

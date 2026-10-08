-- AlterTable
ALTER TABLE "User" ADD COLUMN     "handle" TEXT;

-- AlterTable
ALTER TABLE "WallPost" ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reports" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");

-- CreateIndex
CREATE INDEX "WallPost_createdAt_idx" ON "WallPost"("createdAt");


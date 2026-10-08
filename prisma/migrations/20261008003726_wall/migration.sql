-- AlterTable
ALTER TABLE "User" ADD COLUMN     "handle" TEXT;

-- AlterTable
ALTER TABLE "WallPost" ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reports" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "WallReport" (
    "userId" TEXT NOT NULL,
    "wallPostId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WallReport_pkey" PRIMARY KEY ("userId","wallPostId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");

-- CreateIndex
CREATE INDEX "WallPost_createdAt_idx" ON "WallPost"("createdAt");

-- AddForeignKey
ALTER TABLE "WallReport" ADD CONSTRAINT "WallReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WallReport" ADD CONSTRAINT "WallReport_wallPostId_fkey" FOREIGN KEY ("wallPostId") REFERENCES "WallPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;


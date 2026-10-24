-- CreateTable
CREATE TABLE "Cleanup" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "cleanedOn" TIMESTAMP(3) NOT NULL,
    "distanceM" INTEGER NOT NULL,
    "bags" INTEGER NOT NULL DEFAULT 0,
    "route" JSONB NOT NULL,
    "trimmedM" INTEGER NOT NULL DEFAULT 0,
    "minLng" DOUBLE PRECISION NOT NULL,
    "minLat" DOUBLE PRECISION NOT NULL,
    "maxLng" DOUBLE PRECISION NOT NULL,
    "maxLat" DOUBLE PRECISION NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cleanup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cleanup_createdAt_idx" ON "Cleanup"("createdAt");

-- CreateIndex
CREATE INDEX "Cleanup_authorId_idx" ON "Cleanup"("authorId");

-- AddForeignKey
ALTER TABLE "Cleanup" ADD CONSTRAINT "Cleanup_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

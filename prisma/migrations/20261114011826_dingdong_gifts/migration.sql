-- AlterTable
ALTER TABLE "DingDongDay" ADD COLUMN     "giftNote" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "DingDongGift" (
    "id" TEXT NOT NULL,
    "words" TEXT[],
    "visitorHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "importance" INTEGER,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DingDongGift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DingDongWant" (
    "id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedAt" TIMESTAMP(3),

    CONSTRAINT "DingDongWant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DingDongGift_status_createdAt_idx" ON "DingDongGift"("status", "createdAt");

-- CreateIndex
CREATE INDEX "DingDongGift_visitorHash_createdAt_idx" ON "DingDongGift"("visitorHash", "createdAt");

-- CreateIndex
CREATE INDEX "DingDongWant_status_createdAt_idx" ON "DingDongWant"("status", "createdAt");


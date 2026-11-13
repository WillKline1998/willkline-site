-- CreateTable
CREATE TABLE "DingDongDay" (
    "id" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "stage" TEXT NOT NULL,
    "diary" TEXT NOT NULL,
    "tasteNote" TEXT NOT NULL DEFAULT '',
    "likedIt" BOOLEAN,
    "pattern" JSONB NOT NULL,
    "fallback" BOOLEAN NOT NULL DEFAULT false,
    "dayDate" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DingDongDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DingDongDay_day_key" ON "DingDongDay"("day");


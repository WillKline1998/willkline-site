-- AlterTable
ALTER TABLE "Track" DROP COLUMN "audioUrl",
DROP COLUMN "notes",
ADD COLUMN     "durationSec" INTEGER;

-- CreateIndex
CREATE INDEX "Track_albumId_position_idx" ON "Track"("albumId", "position");


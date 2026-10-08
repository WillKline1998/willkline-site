-- AlterTable
ALTER TABLE "MediaItem" DROP COLUMN "caption";

-- AlterTable
ALTER TABLE "Post" DROP COLUMN "summary",
ADD COLUMN     "mediaKind" TEXT,
ADD COLUMN     "mediaUrl" TEXT;


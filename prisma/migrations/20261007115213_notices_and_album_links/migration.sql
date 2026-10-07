-- CreateTable
CREATE TABLE "Notice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL DEFAULT 'NOTE',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "eventDate" DATETIME,
    "venue" TEXT,
    "linkHref" TEXT,
    "linkLabel" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Album" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'ALBUM',
    "description" TEXT NOT NULL DEFAULT '',
    "year" INTEGER,
    "coverUrl" TEXT,
    "links" TEXT NOT NULL DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Album" ("coverUrl", "createdAt", "description", "id", "published", "slug", "title", "updatedAt", "year") SELECT "coverUrl", "createdAt", "description", "id", "published", "slug", "title", "updatedAt", "year" FROM "Album";
DROP TABLE "Album";
ALTER TABLE "new_Album" RENAME TO "Album";
CREATE UNIQUE INDEX "Album_slug_key" ON "Album"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

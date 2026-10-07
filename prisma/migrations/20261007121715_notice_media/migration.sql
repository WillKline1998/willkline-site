-- CreateTable
CREATE TABLE "NoticeMedia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "noticeId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "NoticeMedia_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "Notice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

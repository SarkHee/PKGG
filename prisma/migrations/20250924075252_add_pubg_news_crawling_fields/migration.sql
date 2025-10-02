/*
  Warnings:

  - Added the required column `link` to the `pubg_news` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_pubg_news" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "url" TEXT,
    "category" TEXT,
    "publishedAt" DATETIME,
    "publishDate" DATETIME,
    "imageUrl" TEXT,
    "summary" TEXT,
    "source" TEXT NOT NULL DEFAULT 'PUBG_OFFICIAL',
    "views" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_pubg_news" ("category", "createdAt", "id", "imageUrl", "isActive", "priority", "publishDate", "summary", "title", "updatedAt", "url") SELECT "category", "createdAt", "id", "imageUrl", "isActive", "priority", "publishDate", "summary", "title", "updatedAt", "url" FROM "pubg_news";
DROP TABLE "pubg_news";
ALTER TABLE "new_pubg_news" RENAME TO "pubg_news";
CREATE UNIQUE INDEX "pubg_news_link_key" ON "pubg_news"("link");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateTable
CREATE TABLE "ranking_update_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "updateType" TEXT NOT NULL,
    "updateTime" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "notices" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "type" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "showUntil" DATETIME,
    "author" TEXT NOT NULL DEFAULT '관리자',
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

/*
  Warnings:

  - You are about to drop the `ForumUser` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ForumUser";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "forum_users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "violationCount" INTEGER NOT NULL DEFAULT 0,
    "lastViolation" DATETIME,
    "violationType" TEXT,
    "violationContent" TEXT,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "banReason" TEXT,
    "banUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "forum_users_username_key" ON "forum_users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "forum_users_email_key" ON "forum_users"("email");

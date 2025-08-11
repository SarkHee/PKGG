/*
  Warnings:

  - A unique constraint covering the columns `[pubgClanId]` on the table `Clan` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Clan" ADD COLUMN "lastSynced" DATETIME;
ALTER TABLE "Clan" ADD COLUMN "pubgClanId" TEXT;
ALTER TABLE "Clan" ADD COLUMN "pubgClanLevel" INTEGER;
ALTER TABLE "Clan" ADD COLUMN "pubgClanTag" TEXT;
ALTER TABLE "Clan" ADD COLUMN "pubgMemberCount" INTEGER;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ClanMember" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nickname" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "style" TEXT NOT NULL,
    "avgDamage" REAL NOT NULL,
    "avgKills" REAL NOT NULL DEFAULT 0,
    "avgAssists" REAL NOT NULL DEFAULT 0,
    "avgSurviveTime" REAL NOT NULL DEFAULT 0,
    "winRate" REAL NOT NULL DEFAULT 0,
    "top10Rate" REAL NOT NULL DEFAULT 0,
    "clanId" INTEGER NOT NULL,
    "pubgClanId" TEXT,
    "pubgPlayerId" TEXT,
    "pubgShardId" TEXT,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClanMember_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ClanMember" ("avgAssists", "avgDamage", "avgKills", "avgSurviveTime", "clanId", "id", "nickname", "score", "style", "top10Rate", "winRate") SELECT "avgAssists", "avgDamage", "avgKills", "avgSurviveTime", "clanId", "id", "nickname", "score", "style", "top10Rate", "winRate" FROM "ClanMember";
DROP TABLE "ClanMember";
ALTER TABLE "new_ClanMember" RENAME TO "ClanMember";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Clan_pubgClanId_key" ON "Clan"("pubgClanId");

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
    "clanId" INTEGER,
    "pubgClanId" TEXT,
    "pubgPlayerId" TEXT,
    "pubgShardId" TEXT,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClanMember_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ClanMember" ("avgAssists", "avgDamage", "avgKills", "avgSurviveTime", "clanId", "id", "lastUpdated", "nickname", "pubgClanId", "pubgPlayerId", "pubgShardId", "score", "style", "top10Rate", "winRate") SELECT "avgAssists", "avgDamage", "avgKills", "avgSurviveTime", "clanId", "id", "lastUpdated", "nickname", "pubgClanId", "pubgPlayerId", "pubgShardId", "score", "style", "top10Rate", "winRate" FROM "ClanMember";
DROP TABLE "ClanMember";
ALTER TABLE "new_ClanMember" RENAME TO "ClanMember";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

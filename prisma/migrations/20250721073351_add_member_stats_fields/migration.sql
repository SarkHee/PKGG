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
    CONSTRAINT "ClanMember_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ClanMember" ("avgDamage", "clanId", "id", "nickname", "score", "style") SELECT "avgDamage", "clanId", "id", "nickname", "score", "style" FROM "ClanMember";
DROP TABLE "ClanMember";
ALTER TABLE "new_ClanMember" RENAME TO "ClanMember";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

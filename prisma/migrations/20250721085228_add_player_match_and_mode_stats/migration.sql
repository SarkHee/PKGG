-- CreateTable
CREATE TABLE "PlayerMatch" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clanMemberId" INTEGER NOT NULL,
    "matchId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "mapName" TEXT,
    "placement" INTEGER NOT NULL,
    "kills" INTEGER NOT NULL,
    "assists" INTEGER NOT NULL,
    "damage" REAL NOT NULL,
    "surviveTime" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlayerMatch_clanMemberId_fkey" FOREIGN KEY ("clanMemberId") REFERENCES "ClanMember" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayerModeStats" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clanMemberId" INTEGER NOT NULL,
    "mode" TEXT NOT NULL,
    "matches" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "top10s" INTEGER NOT NULL,
    "avgDamage" REAL NOT NULL,
    "avgKills" REAL NOT NULL,
    "avgAssists" REAL NOT NULL,
    "winRate" REAL NOT NULL,
    "top10Rate" REAL NOT NULL,
    CONSTRAINT "PlayerModeStats_clanMemberId_fkey" FOREIGN KEY ("clanMemberId") REFERENCES "ClanMember" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);


-- =====================
-- Clan 테이블
-- =====================
CREATE TABLE "Clan" (
  "id"           INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name"         TEXT     NOT NULL,
  "leader"       TEXT     NOT NULL,
  "description"  TEXT,
  "announcement" TEXT,
  "memberCount"  INTEGER  NOT NULL,
  "avgScore"     INTEGER,
  "mainStyle"    TEXT
);

-- =====================
-- ClanMember 테이블
-- =====================
CREATE TABLE "ClanMember" (
  "id"         INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
  "nickname"   TEXT     NOT NULL,
  "score"      INTEGER  NOT NULL,
  "style"      TEXT     NOT NULL,
  "avgDamage"  REAL     NOT NULL,
  "clanId"     INTEGER  NOT NULL,
  CONSTRAINT "ClanMember_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- =====================
-- Clan.name 유니크 인덱스
-- =====================
CREATE UNIQUE INDEX "Clan_name_key" ON "Clan"("name");

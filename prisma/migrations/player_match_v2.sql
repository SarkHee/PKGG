-- PlayerMatch 테이블 v2 마이그레이션
-- Supabase SQL Editor에서 순서대로 실행

-- Step 1: 신규 컬럼 추가 (nullable로 먼저 추가)
ALTER TABLE "PlayerMatch" ADD COLUMN IF NOT EXISTS "pubgAccountId" TEXT;
ALTER TABLE "PlayerMatch" ADD COLUMN IF NOT EXISTS "nickname" TEXT;
ALTER TABLE "PlayerMatch" ADD COLUMN IF NOT EXISTS "shard" TEXT NOT NULL DEFAULT 'steam';

-- Step 2: 기존 레코드 backfill (ClanMember에서 pubgPlayerId, nickname 채움)
UPDATE "PlayerMatch" pm
SET
  "pubgAccountId" = COALESCE(cm."pubgPlayerId", 'legacy_cm_' || pm."clanMemberId"::text),
  "nickname"      = COALESCE(cm."nickname", 'unknown')
FROM "ClanMember" cm
WHERE pm."clanMemberId" = cm.id;

-- Step 3: 남은 NULL 레코드 처리 (orphaned records)
UPDATE "PlayerMatch"
SET
  "pubgAccountId" = 'legacy_' || id::text,
  "nickname"      = 'unknown'
WHERE "pubgAccountId" IS NULL;

-- Step 4: NOT NULL 제약 추가
ALTER TABLE "PlayerMatch" ALTER COLUMN "pubgAccountId" SET NOT NULL;
ALTER TABLE "PlayerMatch" ALTER COLUMN "nickname"      SET NOT NULL;

-- Step 5: clanMemberId nullable로 변경
ALTER TABLE "PlayerMatch" ALTER COLUMN "clanMemberId" DROP NOT NULL;

-- Step 6: 기존 FK 제약 제거 (ClanMember → PlayerMatch 단방향 FK)
ALTER TABLE "PlayerMatch" DROP CONSTRAINT IF EXISTS "PlayerMatch_clanMemberId_fkey";

-- Step 7: unique 제약 추가 전 중복 제거 (같은 pubgAccountId + matchId 쌍)
DELETE FROM "PlayerMatch" a
USING (
  SELECT "pubgAccountId", "matchId", MIN(id) AS keep_id
  FROM "PlayerMatch"
  GROUP BY "pubgAccountId", "matchId"
  HAVING COUNT(*) > 1
) b
WHERE a."pubgAccountId" = b."pubgAccountId"
  AND a."matchId"       = b."matchId"
  AND a.id              != b.keep_id;

-- Step 8: unique 제약 추가
ALTER TABLE "PlayerMatch"
  ADD CONSTRAINT "PlayerMatch_pubgAccountId_matchId_key"
  UNIQUE ("pubgAccountId", "matchId");

-- Step 9: 인덱스 추가 (조회 성능)
CREATE INDEX IF NOT EXISTS "PlayerMatch_pubgAccountId_idx" ON "PlayerMatch" ("pubgAccountId");
CREATE INDEX IF NOT EXISTS "PlayerMatch_nickname_shard_idx" ON "PlayerMatch" ("nickname", "shard");
